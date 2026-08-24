import type { ChartSection } from "./songs";

/**
 * A chart as editable text and back again.
 *
 * One section per line, named before a colon. Bar lines are decoration and are
 * thrown away on the way in, so you can lay a chart out however reads best:
 *
 *   Verse: 1 1 4 1 | 1 5 1 1
 *   Chorus: 4 4 | 1 1
 */
export function chartToText(chart: ChartSection[]): string {
  return chart
    .map((section) => {
      const bars = section.bars
        .map((bar, index) => (index > 0 && index % 4 === 0 ? `| ${bar}` : bar))
        .join(" ");
      return `${section.name}: ${bars}`;
    })
    .join("\n");
}

/**
 * Lines without a name carry on the section above them, because writing a long
 * chart over several lines is the obvious thing to do and turning each line into
 * its own section was not what anybody meant. A blank line starts a new one.
 */
export function textToChart(text: string): ChartSection[] {
  const sections: ChartSection[] = [];
  let current: ChartSection | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      current = null;
      continue;
    }
    const colon = trimmed.indexOf(":");
    const named = colon > 0;
    const body = named ? trimmed.slice(colon + 1) : trimmed;
    const bars = body
      .split(/[|\s]+/)
      .map((bar) => bar.trim())
      .filter(Boolean);
    if (!bars.length) continue;

    if (named) {
      current = { name: trimmed.slice(0, colon).trim(), bars: [...bars] };
      sections.push(current);
    } else if (current) {
      current.bars.push(...bars);
    } else {
      current = { name: sections.length ? `Chart ${sections.length + 1}` : "Chart", bars: [...bars] };
      sections.push(current);
    }
  }
  return sections;
}
