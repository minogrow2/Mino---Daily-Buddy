"use client";

import { useEffect, useState } from "react";
import "@/app/willow-techlab.css";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { addDays, fmtDay, todayYMD } from "@/lib/dates";
import { hm } from "@/lib/willow/logic";
import { deleteScreenDay } from "@/lib/willow/screen-actions";
import { loadRecentScreenDays, loadScreenRange, rangeDays, type ScreenDay } from "@/lib/willow/screen";
import { ScreenDialog } from "./ScreenDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

type Loaded = { today: string; recent: ScreenDay[]; range: ScreenDay[] };

/** Averages, change, the bars for this week against last week, top apps, and the saved days. Nothing is judged. */
function summarise({ today, range, recent }: Loaded) {
  const byDay = new Map(range.map((d) => [d.day, d]));
  const days = rangeDays(today, 7);
  const cur = days.map((d) => byDay.get(d) ?? null);
  const prev = rangeDays(addDays(today, -7), 7).map((d) => byDay.get(d) ?? null);
  const avg = (xs: (ScreenDay | null)[]) => {
    const v = xs.filter((x): x is ScreenDay => !!x).map((x) => x.total);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const avgCur = avg(cur);
  const avgPrev = avg(prev);
  const change = avgCur != null && avgPrev != null && avgPrev > 0 ? Math.round(((avgCur - avgPrev) / avgPrev) * 100) : null;
  const apps = new Map<string, number>();
  for (const d of cur) for (const a of d?.apps ?? []) apps.set(a.name, (apps.get(a.name) ?? 0) + a.minutes);
  const topApps = [...apps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { days, cur, prev, avgCur, avgPrev, change, logged: cur.filter(Boolean).length, topApps, recent };
}

/** The Screen Time page: daily totals and social minutes, log, edit and delete per day. */
export function ScreenTimeView() {
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [dialogDay, setDialogDay] = useState<string | null>(null);
  const { ask, dialog: confirm } = useConfirm();

  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let live = true;
    const today = todayYMD();
    Promise.all([loadRecentScreenDays(14), loadScreenRange(addDays(today, -13), today)])
      .then(([recent, range]) => {
        if (live) {
          setData({ today, recent, range });
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  async function removeDay(day: string) {
    if (!(await ask("Delete this day’s screen time?"))) return;
    try {
      await deleteScreenDay(day);
      reload();
    } catch (e) {
      setErr(errorText(e));
      reload();
    }
  }

  const s = data ? summarise(data) : null;
  const labels = s ? s.days.map((d) => fmtDay(d, { weekday: "short" })) : [];

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Your daily totals</div>
          <h1>Screen time</h1>
        </div>
        <button type="button" className="wbtn primary small" onClick={() => setDialogDay(todayYMD())}>
          Log today
        </button>
      </div>
      <ErrorNote error={err} />

      {!s ? (
        <p className="empty">Opening your screen time…</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <div className="small muted">This week’s average</div>
              <div className="v">{s.avgCur == null ? "—" : hm(s.avgCur)}</div>
            </div>
            <div className="stat">
              <div className="small muted">Previous week’s average</div>
              <div className="v">{s.avgPrev == null ? "—" : hm(s.avgPrev)}</div>
            </div>
            <div className="stat">
              <div className="small muted">Change</div>
              <div className="v">
                {s.change == null ? "—" : s.change > 0 ? `Up ${s.change}%` : s.change < 0 ? `Down ${Math.abs(s.change)}%` : "No change"}
              </div>
            </div>
            <div className="stat">
              <div className="small muted">Days logged, last 7</div>
              <div className="v">{s.logged}/7</div>
            </div>
          </div>
          <p className="small muted">
            Averages use only the days you logged. Change compares this week’s average with the week before.
          </p>

          <div className="grid two">
            <Card title="This week against last week" eyebrow="Minutes per day">
              <Bars
                labels={labels}
                series={[
                  { name: "This week", values: s.cur.map((d) => Math.round(d?.total ?? 0)), color: "var(--rose)" },
                  { name: "Last week", values: s.prev.map((d) => Math.round(d?.total ?? 0)), color: "var(--pink)" },
                ]}
              />
              <div className="screen-legend">
                <span className="row-inline" style={{ gap: 6 }}>
                  <i className="screen-swatch" style={{ background: "var(--rose)" }} />
                  This week
                </span>
                <span className="row-inline" style={{ gap: 6 }}>
                  <i className="screen-swatch" style={{ background: "var(--pink)" }} />
                  Last week
                </span>
              </div>
            </Card>
            <Card title="Most used this week" eyebrow="Apps">
              {s.topApps.length ? (
                <ul className="list">
                  {s.topApps.map(([name, min]) => (
                    <li key={name} className="item">
                      <span className="grow">{name}</span>
                      <span className="num">{hm(min)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty">Add the top apps when you log a day.</div>
              )}
            </Card>
          </div>

          <Card title="Records" eyebrow="History">
            {s.recent.length ? (
              <ul className="list">
                {s.recent.map((d) => (
                  <li key={d.day} className="item screen-record">
                    <span className="grow">
                      {fmtDay(d.day, { weekday: "short", month: "short", day: "numeric" })}{" "}
                      <span className="small muted">
                        · social {hm(d.social)}
                        {d.apps.length ? ` · ${d.apps.map((a) => a.name).join(", ")}` : ""}
                      </span>
                    </span>
                    <span className="num">{hm(d.total)}</span>
                    <span className="screen-record-actions">
                      <button type="button" className="wbtn ghost small" onClick={() => setDialogDay(d.day)}>
                        Edit
                      </button>
                      <button type="button" className="wbtn danger small" onClick={() => removeDay(d.day)}>
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No days logged yet. Log a day to see it here.</div>
            )}
          </Card>
        </>
      )}

      {dialogDay && (
        <ScreenDialog
          day={dialogDay}
          onSaved={() => {
            setDialogDay(null);
            reload();
          }}
          onClose={() => setDialogDay(null)}
        />
      )}
      {confirm}
    </div>
  );
}

/** Two-series bars for the week, drawn as SVG with the legacy layout. */
function Bars({ labels, series }: { labels: string[]; series: { name: string; values: number[]; color: string }[] }) {
  const W = 640;
  const H = 180;
  const L = 34;
  const B = 24;
  const T = 8;
  const max = Math.max(1, ...series.flatMap((x) => x.values));
  const n = labels.length || 1;
  const gw = (W - L) / n;
  const bw = (gw * 0.72) / series.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart screen-chart" role="img" aria-label="Minutes per day, this week against last week">
      {[0, 0.5, 1].map((f) => {
        const y = T + (H - B - T) * (1 - f);
        return (
          <g key={f}>
            <line className="grid-line" x1={L} x2={W} y1={y} y2={y} />
            <text x={L - 6} y={y + 4} textAnchor="end">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      {series.map((s, si) =>
        s.values.map((v, i) => {
          const bh = (v / max) * (H - B - T);
          const x = L + i * gw + gw * 0.14 + si * bw;
          return (
            <rect key={`${si}-${i}`} x={x} y={H - B - bh} width={bw * 0.9} height={bh} rx={3} style={{ fill: s.color }}>
              <title>{`${s.name}, ${labels[i] ?? ""}: ${hm(v)}`}</title>
            </rect>
          );
        }),
      )}
      {labels.map((l, i) => (
        <text key={`${l}-${i}`} x={L + i * gw + gw / 2} y={H - 6} textAnchor="middle">
          {l}
        </text>
      ))}
    </svg>
  );
}
