/**
 * Web Audio for the practice tools: a scheduled metronome click and a sustained drone.
 *
 * Everything is scheduled against `context.currentTime`, never `setTimeout`, so the
 * click stays in time when the main thread is busy redrawing the neck.
 */

export type DroneSettings = {
  /** Pitch class of the key centre, 0 = C. */
  pitchClass: number;
  /** Octave shift from the default C2 register. */
  octave: number;
  /** 0 to 1. */
  volume: number;
  /** Add the fifth above the root, so the drone sits under a chord rather than a note. */
  fifth: boolean;
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private unlocked = false;
  private listeners = new Set<() => void>();
  private droneGain: GainNode | null = null;
  private droneVoices: OscillatorNode[] = [];
  private droneLfo: OscillatorNode | null = null;
  private droneSettings: DroneSettings | null = null;

  /** Creates the context on first use, and resumes it after an iOS/Safari suspend. */
  ensure(): AudioContext {
    if (!this.context) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new Ctor();
      /*
       * Safari mutes Web Audio when the hardware silent switch is on unless the
       * page says it is playback rather than an incidental noise. An iPad on a
       * stand is very often muted, which made this look like the audio was
       * broken rather than silenced.
       */
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) {
        try {
          session.type = "playback";
        } catch {
          // Older Safari. Nothing to fall back to.
        }
      }
    }
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  /** True once a real gesture has started the context and sound can be made. */
  get ready(): boolean {
    return this.unlocked && this.context?.state === "running";
  }

  onReadyChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private announce() {
    for (const listener of this.listeners) listener();
  }

  /**
   * iOS will not start an audio context except inside a real gesture, and a
   * toggle that sets state and lets an effect do the work is not one. So the
   * first touch anywhere on the page unlocks it, whatever that touch was for.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.ensure();
    try {
      if (ctx.state === "suspended") await ctx.resume();
      // A moment of silence, which is what actually convinces iOS.
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Left locked; the caller can ask again on the next gesture.
    }
    const was = this.unlocked;
    this.unlocked = ctx.state === "running";
    if (was !== this.unlocked) this.announce();
    return this.unlocked;
  }

  get now(): number {
    return this.context ? this.context.currentTime : 0;
  }

  click(time: number, accent: boolean, volume: number) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 900;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime((accent ? 0.5 : 0.32) * volume, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  /**
   * Starts or retunes the drone. Changing pitch glides rather than restarting, so
   * switching key while the metronome runs does not click.
   */
  setDrone(settings: DroneSettings | null) {
    if (!settings) {
      this.stopDrone();
      return;
    }
    const ctx = this.ensure();
    const previous = this.droneSettings;
    this.droneSettings = settings;

    const needsRebuild = !this.droneGain || !previous || previous.fifth !== settings.fifth;
    if (needsRebuild) {
      this.stopDrone();
      this.buildDrone(ctx, settings);
    } else {
      this.tuneDrone(ctx, settings);
    }
    this.droneGain?.gain.setTargetAtTime(settings.volume * 0.18, ctx.currentTime, 0.05);
  }

  private buildDrone(ctx: AudioContext, settings: DroneSettings) {
    const out = ctx.createGain();
    out.gain.value = 0;

    // A gentle low-pass keeps the sawtooth partials from competing with the guitar.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(out);
    out.connect(ctx.destination);

    // Slow amplitude movement so the drone breathes instead of sitting dead flat.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(out.gain);
    lfo.start();
    this.droneLfo = lfo;

    const voices: OscillatorNode[] = [];
    const addVoice = (type: OscillatorType, detune: number, level: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.detune.value = detune;
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      voices.push(osc);
    };
    addVoice("sine", 0, 0.9); // root, the note you tune your ear to
    addVoice("sawtooth", -6, 0.16); // a little edge so it cuts through an amp
    addVoice("sine", 4, 0.5); // octave, filled in by tuneDrone
    if (settings.fifth) addVoice("sine", 0, 0.3);

    this.droneVoices = voices;
    this.droneGain = out;
    this.tuneDrone(ctx, settings);
    out.gain.setTargetAtTime(settings.volume * 0.18, ctx.currentTime, 0.08);
  }

  private tuneDrone(ctx: AudioContext, settings: DroneSettings) {
    const base = frequencyOf(settings.pitchClass, settings.octave);
    const targets = [base, base, base * 2, base * 1.5];
    this.droneVoices.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(targets[i] ?? base, ctx.currentTime, 0.06);
    });
  }

  stopDrone() {
    const ctx = this.context;
    const gain = this.droneGain;
    const voices = this.droneVoices;
    const lfo = this.droneLfo;
    this.droneGain = null;
    this.droneVoices = [];
    this.droneLfo = null;
    this.droneSettings = null;
    if (!ctx || !gain) return;
    // Fade out before tearing the voices down, otherwise it pops.
    const stopAt = ctx.currentTime + 0.25;
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
    voices.forEach((osc) => osc.stop(stopAt));
    lfo?.stop(stopAt);
    window.setTimeout(() => gain.disconnect(), 400);
  }

  /** A short plucked tone, used by the fretboard when you tap a note. */
  /**
   * A chord, at a time you name.
   *
   * Scheduled against the audio clock rather than played now, so it can be
   * queued by the same lookahead the click uses and lands exactly on the bar.
   * The notes are spread by a few milliseconds because a chord on a guitar is
   * a strum, not six strings hit at once, and the ear notices.
   */
  chord(time: number, midis: number[], volume = 0.5) {
    const ctx = this.ensure();
    if (!midis.length || volume <= 0) return;
    midis.forEach((midi, index) => {
      const at = time + index * 0.016;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "triangle";
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      filter.type = "lowpass";
      // Opens on the attack and closes as it decays, which is roughly what a
      // plucked string does and keeps a held chord from turning into an organ.
      filter.frequency.setValueAtTime(2200, at);
      filter.frequency.exponentialRampToValueAtTime(600, at + 1.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      // Quiet enough to play over. It is the backing, not the part.
      const peak = (0.12 * volume) / Math.sqrt(midis.length);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
      osc.start(at);
      osc.stop(at + 2);
    });
  }

  pluck(midi: number, volume = 0.5) {
    const ctx = this.ensure();
    const time = ctx.currentTime + 0.01;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + 0.5);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.35 * volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
    osc.start(time);
    osc.stop(time + 1.2);
  }
}

function frequencyOf(pitchClass: number, octave: number) {
  const midi = 36 + pitchClass + octave * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let shared: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!shared) shared = new AudioEngine();
  return shared;
}
