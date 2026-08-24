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

export function textToChart(text: string): ChartSection[] {
  const sections: ChartSection[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    const name = colon > 0 ? trimmed.slice(0, colon).trim() : "Chart";
    const body = colon > 0 ? trimmed.slice(colon + 1) : trimmed;
    const bars = body
      .split(/[|\s]+/)
      .map((bar) => bar.trim())
      .filter(Boolean);
    if (bars.length) sections.push({ name, bars });
  }
  return sections;
}
