# Position — CAGED practice

The five CAGED shapes in any key, major or minor, with the scale built around each one,
a drone that holds the key centre, and a metronome that can move you between positions
while you play.

Built with Next.js, deployed on Vercel.

The single-file version lives at [`public/classic/index.html`](public/classic/index.html) and is
served at `/classic/index.html`. It has no build step and no dependencies, and it carries the
layer model: chord tones, scale, R-3-5 triads on a selectable string set, and ghosts, resolved
by a precedence ladder rather than by draw order, behind four named practice modes.

## What it does

- **Five shapes, twelve keys, both qualities.** The CAGED geometry is the same in minor;
  the thirds drop a semitone and the scale set changes. Both are worked out from pitch
  classes rather than hard-coded diagrams, so every key is correct.
- **Scales around the shape.** Chord tones, pentatonics, blues, and the modes that sit
  naturally over each quality. Chord tones you are actually fretting get a thick ring.
- **Drone.** A sustained root under the metronome, optionally with the fifth, in three
  octaves. It retunes rather than restarting when you change key, so it never clicks.
- **Metronome that moves you.** Change position every 1, 2, 4 or 8 bars, going up the
  neck, down it, at random, or sliding back and forth between two shapes you pick.
- **Two-shape drills.** Pick a second shape and the neck shows where you are going next
  as a dashed box while the metronome alternates between the pair.
- **Tap a note to hear it.** Useful against the drone for working out what a degree
  actually sounds like.

Settings are remembered in the browser between sessions.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploying

Push this repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
Vercel detects Next.js and needs no configuration. Or from the CLI:

```bash
npm i -g vercel
vercel          # preview URL
vercel --prod   # production URL
```

## On the iPad

Open the deployed URL in Safari, then Share → Add to Home Screen. It launches full-screen
with no browser chrome, and the screen stays awake while the metronome is running.

## Controls

| Action | Control |
| --- | --- |
| Start / stop | tap the circle, or press space |
| Tempo | slider, tap tempo, or up/down arrows |
| Change position | tap a shape, or left/right arrows |
| Zoom | `Z`, or the View control |
| Drone | `D` |
| Mute the click | `M` |

## Notes

- Fret numbers are positions on the neck, not sounding pitch. If you are tuned down a
  whole step the shapes are identical; the key selector just names what you would call it
  in standard tuning.
- The C and G minor shapes are honest transformations of their major forms rather than
  chords anyone plays often. Every fretted note is still a chord tone, which is what
  matters for finding the shape on the neck.
- The metronome is scheduled against the Web Audio clock, not `setTimeout`, so it stays in
  time while the neck redraws.

## The single-file app

`public/classic/index.html` runs the same neck through a different model. Every visible fret
becomes one record carrying its memberships (`inChord`, `inScale`, `inTriad`, `isRoot`,
`isTopNote`), and a single precedence ladder picks exactly one treatment per note, so layers
can overlap without overdrawing each other. On top of that:

- **R-3-5 triads** on the `6-5-4`, `5-4-3`, `4-3-2` and `3-2-1` string sets, read off the chord
  tones around the current shape rather than stored as grips. It names the inversion and marks
  the top note, which is what you actually choose a comping voicing by.
- **Practice modes** - Learn the neck, Position, Comping, Lead - which set scope and layers
  together. Individual layer toggles sit behind Settings and mark the mode as modified rather
  than deselecting it.
- **Labels: degrees, notes, or none.** None is the one that tells you whether you know the shape
  or are only reading it.

## Ideas for later

- Chord progression trainer, cycling changes in time and showing the nearest shape
- Fretboard quiz: name the degree under your finger, timed
- Practice log with tempo history
