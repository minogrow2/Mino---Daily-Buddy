"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/willow-analytics.css";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { todayYMD } from "@/lib/dates";
import { loadAnalytics, type AnalyticsRows } from "@/lib/willow/analytics";
import { pct } from "@/lib/willow/logic";
import { BarChart, Legend, LineChart } from "./Charts";
import { buildFigures, php } from "./figures";

const RANGES = [7, 30, 90];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Analytics: daily charts, weekly, consistency, goal and growth summaries for the last 7, 30 or 90 days. */
export function AnalyticsView() {
  const [today, setToday] = useState<string | null>(null);
  const [range, setRange] = useState(30);
  const [draft, setDraft] = useState(30);
  const [loaded, setLoaded] = useState<{ key: string; rows: AnalyticsRows } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // The clock is read only in the browser, never while the page is prerendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock after mount
    setToday(todayYMD());
  }, []);

  useEffect(() => {
    if (!today) return;
    let live = true;
    loadAnalytics(today, range)
      .then((rows) => {
        if (live) {
          setLoaded({ key: `${today}|${range}`, rows });
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [today, range]);

  // Figures are shown only for the range that was loaded, so a new range never mixes with the old one.
  const f = useMemo(() => {
    if (!today || !loaded || loaded.key !== `${today}|${range}`) return null;
    return buildFigures(loaded.rows, today, range);
  }, [today, range, loaded]);

  return (
    <div className="grid">
      <div className="row-inline ana-head">
        <div>
          <div className="eyebrow">Progress you can read</div>
          <h1>Analytics</h1>
        </div>
        <form
          className="row-inline"
          onSubmit={(e) => {
            e.preventDefault();
            setRange(draft);
          }}
        >
          <select
            className="winput ana-range"
            name="range"
            aria-label="Date range"
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
          >
            {RANGES.map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
          <button type="submit" className="wbtn soft small">
            Apply
          </button>
        </form>
      </div>

      <ErrorNote error={err} />
      {!f && !err && <div className="empty">Opening analytics…</div>}

      {f && (
        <>
          {!f.hasRecords && (
            <div className="empty">Nothing to chart yet. Check off habits, add tasks, and log activities. Your charts fill in as you go.</div>
          )}

          <div className="grid two">
            <Card eyebrow="Daily" title="Tasks completed versus planned">
              <BarChart
                label="Tasks completed versus planned"
                labels={f.labels}
                series={[
                  { name: "Planned", values: f.planned, color: "var(--pink)" },
                  { name: "Completed", values: f.completed, color: "var(--rose)" },
                ]}
              />
              <Legend
                items={[
                  ["var(--pink)", "Planned"],
                  ["var(--rose)", "Completed"],
                ]}
              />
            </Card>
            <Card eyebrow="Daily" title="Habits maintained">
              <LineChart label="Habits maintained" labels={f.labels} values={f.habitShare} />
              <p className="small muted ana-note">Share of your daily core habits checked each day.</p>
            </Card>
            <Card eyebrow="Daily" title="Learning minutes">
              <BarChart
                label="Learning minutes"
                labels={f.labels}
                series={[{ name: "Learning", values: f.learnMinutes, color: "var(--butter-deep)" }]}
              />
            </Card>
            <Card eyebrow="Daily" title="Screen time (minutes)" id="screen-chart">
              <BarChart
                label="Screen time in minutes"
                labels={f.labels}
                series={[{ name: "Screen", values: f.screenMinutes, color: "var(--rose)" }]}
              />
            </Card>
          </div>

          <div className="grid two">
            <Card eyebrow="Weekly" title="Weekly task completion">
              <div className="table-scroll">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Done</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.weeks.map((w, i) => (
                      <tr key={i}>
                        <td>{w.label}</td>
                        <td className="num">
                          {w.completed}/{w.planned}
                        </td>
                        <td className="num">{pct(w.completed, w.planned)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card eyebrow="Weekly and monthly" title="Consistency">
              <div className="table-scroll">
                <table className="simple">
                  <tbody>
                    {f.consistency.map((c) => (
                      <tr key={c.label}>
                        <td>{c.label}</td>
                        <td className="num">{c.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="grid two">
            <Card eyebrow="Monthly" title="Goal progression">
              <div className="table-scroll">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>Goal</th>
                      <th>Milestones</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.goals.map((g) => (
                      <tr key={g.id}>
                        <td className="ana-wrap">{g.name}</td>
                        <td className="num">
                          {g.done}/{g.total}
                        </td>
                        <td className="num">{pct(g.done, g.total)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card eyebrow="Personal growth" title="Growth summary">
              <ul className="ana-growth">
                {f.growth.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
              <p className="small muted ana-summary">
                Courses: {f.courses}. Tech projects completed: {f.projectsDone}. Total savings: {php(f.savings)}.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
