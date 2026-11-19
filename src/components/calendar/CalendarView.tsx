"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { addDays, daysInMonth, fmtDay, fmtMonth, shiftMonth, todayYMD, weekday } from "@/lib/dates";
import { scoreFn } from "@/lib/willow/heat";
import { level, weekStart } from "@/lib/willow/logic";
import { loadYear } from "@/lib/willow/data";
import type { YearRows } from "@/lib/willow/types";
import { DayPanel } from "./DayPanel";

type View = { today: string; mode: "year" | "month"; year: number; month: string; selected: string };

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The calendar: a year of squares or one month, and the day page for the day picked. A link from Home opens a day with ?day=. */
export function CalendarView() {
  // The clock and the ?day= link are read only in the browser, never while the page is prerendered.
  const [view, setView] = useState<View | null>(null);
  const [rows, setRows] = useState<{ year: number; data: YearRows } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const today = todayYMD();
    const asked = new URLSearchParams(window.location.search).get("day");
    const day = isDay(asked) ? asked : today;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock and the ?day= link after mount
    setView({ today, mode: "year", year: Number(day.slice(0, 4)), month: day.slice(0, 7), selected: day });
  }, []);

  const year = view?.year ?? null;
  useEffect(() => {
    if (year === null) return;
    let live = true;
    loadYear(year)
      .then((data) => {
        if (live) {
          setRows({ year, data });
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [year, tick]);

  if (!view) return <div className="empty">Opening the calendar…</div>;

  const { today, mode, selected } = view;
  const yearRows = rows && rows.year === view.year ? rows.data : null;
  const score = scoreFn(yearRows);
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = today.slice(0, 7);
  const setMode = (m: "year" | "month") => setView((v) => v && { ...v, mode: m });
  const pick = (d: string) => {
    setView((v) => v && { ...v, selected: d });
    if (window.innerWidth < 900) document.getElementById("day-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  let grid: ReactNode;
  let nav: ReactNode;
  if (mode === "year") {
    const jan1 = `${view.year}-01-01`;
    const dec31 = `${view.year}-12-31`;
    const days: string[] = [];
    for (let d = weekStart(jan1); d <= addDays(weekStart(dec31), 6); d = addDays(d, 1)) days.push(d);
    grid = (
      <div className="heat-wrap">
        <div className="heat">
          {days.map((d) => {
            if (d < jan1 || d > dec31) return <span key={d} className="blank" aria-hidden="true" />;
            const lv = level(score(d));
            return (
              <button
                key={d}
                type="button"
                className={`cell l${lv}${d === today ? " today" : ""}${d > today ? " future" : ""}`}
                aria-label={`${fmtDay(d, { weekday: "long", month: "long", day: "numeric" })}, level ${lv}`}
                onClick={() => pick(d)}
              />
            );
          })}
        </div>
      </div>
    );
    nav = (
      <div className="row-inline" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <button type="button" className="wbtn ghost small" onClick={() => setView((v) => v && { ...v, year: v.year - 1 })}>
          ← {view.year - 1}
        </button>
        <strong className="display">{view.year}</strong>
        <button
          type="button"
          className="wbtn ghost small"
          disabled={view.year >= thisYear}
          onClick={() => setView((v) => v && { ...v, year: v.year + 1 })}
        >
          {view.year + 1} →
        </button>
      </div>
    );
  } else {
    const first = `${view.month}-01`;
    const lead = (weekday(first) + 6) % 7;
    const cells = [];
    for (const x of DOW) cells.push(<div key={`h-${x}`} className="dow">{x}</div>);
    for (let i = 0; i < lead; i++) cells.push(<div key={`b-${i}`} className="day blank" />);
    for (let k = 1; k <= daysInMonth(first); k++) {
      const ymd = `${view.month}-${String(k).padStart(2, "0")}`;
      const lv = level(score(ymd));
      cells.push(
        <button
          key={ymd}
          type="button"
          className={`day l${lv}${ymd === today ? " today" : ""}`}
          aria-label={`${fmtDay(ymd, { month: "long", day: "numeric" })}, level ${lv}`}
          onClick={() => pick(ymd)}
        >
          {k}
        </button>,
      );
    }
    grid = <div className="month-grid">{cells}</div>;
    nav = (
      <div className="row-inline" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <button
          type="button"
          className="wbtn ghost small"
          onClick={() => setView((v) => v && { ...v, month: shiftMonth(v.month, -1), year: Number(shiftMonth(v.month, -1).slice(0, 4)) })}
        >
          ← Previous
        </button>
        <strong className="display">{fmtMonth(first)}</strong>
        <button
          type="button"
          className="wbtn ghost small"
          disabled={view.month >= thisMonth}
          onClick={() => setView((v) => v && { ...v, month: shiftMonth(v.month, 1), year: Number(shiftMonth(v.month, 1).slice(0, 4)) })}
        >
          Next →
        </button>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Activity intensity</div>
          <h1>Calendar</h1>
        </div>
        <div className="row-inline">
          <button type="button" className={`wbtn small ${mode === "year" ? "primary" : "soft"}`} aria-pressed={mode === "year"} onClick={() => setMode("year")}>
            Year
          </button>
          <button type="button" className={`wbtn small ${mode === "month" ? "primary" : "soft"}`} aria-pressed={mode === "month"} onClick={() => setMode("month")}>
            Month
          </button>
        </div>
      </div>

      <Card className="reveal">
        {grid}
        <div className="legend" style={{ marginTop: 12 }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} style={{ background: `var(--heat-${l})` }} />
          ))}
          <span>More</span>
          <span className="muted" style={{ marginLeft: 8 }}>
            Learning, workouts, socializing, rest, journaling all count.
          </span>
        </div>
        {nav}
      </Card>

      <ErrorNote error={err} />

      <DayPanel key={selected} day={selected} today={today} onChanged={() => setTick((t) => t + 1)} />
    </div>
  );
}
