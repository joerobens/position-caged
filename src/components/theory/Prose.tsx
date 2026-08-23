import type { ReactNode } from "react";

export function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-[17px] font-medium tracking-tight first:mt-0">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-[70ch] text-[14.5px] leading-[1.75] text-bone-dim">{children}</p>;
}

export function B({ children }: { children: ReactNode }) {
  return <b className="font-medium text-bone">{children}</b>;
}

export function N({ children }: { children: ReactNode }) {
  return <code className="rounded bg-board px-1.5 py-0.5 font-mono text-[13px] text-bone">{children}</code>;
}

/** A table of notation, which is most of what a reference page is. */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="bg-panel">
            {head.map((cell) => (
              <th key={cell} className="label border-b border-line px-3 py-2.5 font-normal">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-3 py-2.5 align-top ${cellIndex === 0 ? "whitespace-nowrap font-mono text-bone" : "text-bone-dim"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A chart laid out the way it would be on paper, four bars to a line. */
export function Chart({ lines, caption }: { lines: string[][]; caption?: string }) {
  return (
    <figure className="my-5">
      <div className="rounded-xl border border-line bg-panel p-3">
        {lines.map((line, index) => (
          <div key={index} className="flex flex-wrap gap-1.5 [&:not(:first-child)]:mt-1.5">
            {line.map((bar, barIndex) => (
              <div
                key={barIndex}
                className="min-w-[62px] rounded-lg border border-line bg-ink px-2 py-2 text-center font-mono text-[15px] font-medium text-bone"
              >
                {bar}
              </div>
            ))}
          </div>
        ))}
      </div>
      {caption ? <figcaption className="mt-2 text-[13px] leading-relaxed text-bone-dim">{caption}</figcaption> : null}
    </figure>
  );
}

export function Aside({ children }: { children: ReactNode }) {
  return (
    <aside className="mt-5 rounded-xl border border-line border-l-[3px] border-l-[color:var(--accent)] bg-panel p-4 text-[13.5px] leading-[1.7] text-bone-dim">
      {children}
    </aside>
  );
}
