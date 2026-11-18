"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { addDays, fmtDay } from "@/lib/dates";
import { loadYear } from "@/lib/willow/data";
import { level, weekStart } from "@/lib/willow/logic";
import type { YearRows } from "@/lib/willow/types";
import { DayDialog } from "./DayDialog";

const LEVEL_CLASS = [
  "bg-[rgba(110,156,126,0.14)]",
  "bg-[#fbe9ec]",
  "bg-[#f7d4d9]",
  "bg-[#e9a4b0]",
  "bg-[#a9535f]",
];

const countBy = (days: string[]) => days.reduce<Record<string, number>>((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {});

/** One square per day of a year, Monday at the top, columns are weeks. Tap a day to see what it held. */
export function Heatmap({ today, version }: { today: string; version: number }) {
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<YearRows | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadYear(year)
      .then((r) => {
        if (alive) {
          setRows(r);
          setErr(null);
        }
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message);
      });
    return () => {
      alive = false;
    };
  }, [year, version]);

  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const start = weekStart(jan1);
  const end = addDays(weekStart(dec31), 6);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const weeks = days.length / 7;

  const a = countBy(rows?.activityDays ?? []);
  const c = countBy(rows?.checkDays ?? []);
  const j = countBy(rows?.journalDays ?? []);
  const scoreOf = (d: string) => (a[d] ?? 0) + (c[d] ?? 0) + (j[d] ?? 0);
  const active = days.filter((d) => d >= jan1 && d <= dec31 && scoreOf(d) > 0).length;

  return (
    <Card
      eyebrow="Your year at a glance"
      title="Days I showed up"
      right={
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm" aria-label="Previous year" onClick={() => setYear(year - 1)}>‹ {year - 1}</button>
          <strong className="font-display text-xl tabular-nums">{year}</strong>
          <button type="button" className="btn btn-sm" aria-label="Next year" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>{year + 1} ›</button>
        </div>
      }
    >
      {err && <p className="mb-3 text-sm text-rose">{err}</p>}
      {!rows ? (
        <p className="py-8 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div
            role="img"
            aria-label={`Activity map for ${year}`}
            className="grid w-max gap-[3px]"
            style={{ gridTemplateRows: "repeat(7, 12px)", gridTemplateColumns: `repeat(${weeks}, 12px)`, gridAutoFlow: "column" }}
          >
            {days.map((d) => {
              if (d < jan1 || d > dec31) return <span key={d} aria-hidden />;
              const score = scoreOf(d);
              const future = d > today;
              const label = `${fmtDay(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}: ${score} ${score === 1 ? "entry" : "entries"}`;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future}
                  title={label}
                  aria-label={label}
                  onClick={() => setPicked(d)}
                  className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[level(score)]} ${d === today ? "ring-2 ring-[var(--rose)]" : ""} ${future ? "opacity-40" : ""}`}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{active} {active === 1 ? "day" : "days"} with a checkmark, activity or journal entry in {year}</span>
        <span className="flex items-center gap-1">
          Less
          {LEVEL_CLASS.map((cls, i) => <i key={i} className={`inline-block h-3 w-3 rounded-[3px] ${cls}`} />)}
          More
        </span>
      </div>
      {picked && <DayDialog day={picked} onClose={() => setPicked(null)} />}
    </Card>
  );
}
