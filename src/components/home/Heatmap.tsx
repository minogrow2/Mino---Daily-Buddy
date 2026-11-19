"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { addDays, fmtDay } from "@/lib/dates";
import { loadYear } from "@/lib/willow/data";
import { scoreFn } from "@/lib/willow/heat";
import { level, weekStart } from "@/lib/willow/logic";
import type { YearRows } from "@/lib/willow/types";

/** One square per day of a year, Monday at the top, columns are weeks. Tap a day to open it on the calendar. */
export function Heatmap({ today, version }: { today: string; version: number }) {
  const router = useRouter();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<YearRows | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const scoreOf = scoreFn(rows);
  const active = days.filter((d) => d >= jan1 && d <= dec31 && scoreOf(d) > 0).length;

  return (
    <Card
      id="heatmap"
      eyebrow="Your year at a glance"
      title="Days I showed up"
      right={
        <div className="row-inline" style={{ justifyContent: "space-between" }}>
          <button type="button" className="wbtn ghost small" aria-label="Previous year" onClick={() => setYear(year - 1)}>
            ‹ {year - 1}
          </button>
          <strong className="num" style={{ fontSize: 16 }}>
            {year}
          </strong>
          <button type="button" className="wbtn ghost small" aria-label="Next year" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>
            {year + 1} ›
          </button>
        </div>
      }
    >
      {err && <p className="err">{err}</p>}
      {!rows ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="heat-wrap">
            <div className="heat" role="img" aria-label={`Activity map for ${year}`}>
              {days.map((d) => {
                if (d < jan1 || d > dec31) return <span key={d} className="cell blank" aria-hidden="true" />;
                const score = scoreOf(d);
                const future = d > today;
                const label = `${fmtDay(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}: ${score} ${score === 1 ? "entry" : "entries"}`;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`cell l${level(score)}${d === today ? " today" : ""}${future ? " future" : ""}`}
                    disabled={future}
                    title={label}
                    aria-label={label}
                    onClick={() => router.push(`/calendar?day=${d}`)}
                  />
                );
              })}
            </div>
          </div>
          <div className="row-inline" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="small muted">
              {active} {active === 1 ? "day" : "days"} with a checkmark, activity or journal entry in {year}
            </span>
            <span className="legend">
              Less <i style={{ background: "var(--heat-0)" }} /> <i style={{ background: "var(--heat-1)" }} /> <i style={{ background: "var(--heat-2)" }} />{" "}
              <i style={{ background: "var(--heat-3)" }} /> <i style={{ background: "var(--heat-4)" }} /> More
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
