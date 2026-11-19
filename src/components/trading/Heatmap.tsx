"use client";

import { useMemo, useState } from "react";
import { addDays, fmtDay, todayYMD, weekday } from "@/lib/dates";
import type { DayItem } from "@/lib/trading/types";

const LEVEL_COLORS = ["var(--sage-fill)", "#cfe5d5", "#9ccaa9", "#5fa075", "#2f6b46"];
const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
const WEEKS = 53;

export function Heatmap({ byDay }: { byDay: Record<string, DayItem[]> }) {
  const today = todayYMD();
  const [selected, setSelected] = useState<string | null>(null);

  const { weeks, months } = useMemo(() => {
    const start = addDays(today, -((WEEKS - 1) * 7 + weekday(today)));
    const weeks: (string | null)[][] = [];
    const months: { w: number; label: string }[] = [];
    let lastMonth = "";
    for (let w = 0; w < WEEKS; w++) {
      const col: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const day = addDays(start, w * 7 + d);
        col.push(day > today ? null : day);
      }
      weeks.push(col);
      const first = col.find(Boolean);
      if (first) {
        const m = fmtDay(first, { month: "short" });
        if (m !== lastMonth) {
          months.push({ w, label: m });
          lastMonth = m;
        }
      }
    }
    return { weeks, months };
  }, [today]);

  const items = selected ? byDay[selected] ?? [] : [];

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-max">
          <div className="relative mb-1 h-4 text-[11px] text-muted" style={{ width: WEEKS * 16 }}>
            {months.map((m) => (
              <span key={m.w} className="absolute" style={{ left: m.w * 16 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]" role="group" aria-label="Finance Trading activity, last year">
            {weeks.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map((day, d) =>
                  day ? (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelected(day === selected ? null : day)}
                      title={`${fmtDay(day)}: ${(byDay[day] ?? []).length} item(s)`}
                      aria-label={`${fmtDay(day)}, ${(byDay[day] ?? []).length} items`}
                      aria-pressed={day === selected}
                      className="h-[13px] w-[13px] rounded-[3px] outline-offset-1 transition hover:scale-125"
                      style={{
                        background: LEVEL_COLORS[level((byDay[day] ?? []).length)],
                        outline: day === selected ? "2px solid var(--rose)" : undefined,
                      }}
                    />
                  ) : (
                    <span key={d} className="h-[13px] w-[13px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        Less
        {LEVEL_COLORS.map((c, i) => (
          <span key={i} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        More
        <span className="ml-3">Learning, documenting and backtesting all count.</span>
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border border-line p-4" style={{ background: "var(--sage-fill)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{fmtDay(selected, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
            <button className="btn btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing recorded on this day.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((it, i) => (
                <li key={i} className="text-sm">
                  <span className="tag mr-2">{it.kind === "document" ? "Document" : "Activity"}</span>
                  <strong>{it.title}</strong>
                  {it.detail && <span className="text-muted"> · {it.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
