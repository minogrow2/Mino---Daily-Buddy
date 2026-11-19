"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ErrorNote } from "@/components/ui/Modal";
import { GOALS, GOAL_TINT, type GoalKey } from "@/lib/willow/constants";
import { loadGoalTiles } from "@/lib/willow/goals";
import "@/app/willow-goals.css";
import { useLoad } from "./useLoad";

/** The activities a goal’s ring is measured against over 30 days. */
const GOAL_MONTH_TARGET = 12;

const GOAL_PIC: Record<GoalKey, string> = {
  trading: "/img/willow/scene-desk.jpg",
  ai: "/img/willow/scene-hollow.jpg",
  glow: "/img/willow/scene-bath.jpg",
  tech: "/img/willow/scene-fishing.jpg",
  money: "/img/willow/scene-grass.jpg",
  reading: "/img/willow/goal-reading.jpg",
  cs: "/img/willow/goal-cs.jpg",
};

/** The progress ring: the count sits in the middle, the arc is the 30-day count against the monthly goal. */
function Ring({ count, label }: { count: number | null; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const p = count === null ? 0 : Math.min(1, count / GOAL_MONTH_TARGET);
  return (
    <div className="ring-wrap" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="ring-track" cx="36" cy="36" r={r} />
        <circle
          className="ring-arc"
          cx="36"
          cy="36"
          r={r}
          transform="rotate(-90 36 36)"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={(c * (1 - p)).toFixed(1)}
        />
      </svg>
      <span className="ring-num">{count ?? "–"}</span>
    </div>
  );
}

/** My goals: one tile per goal, each linking to its page. */
export function GoalList() {
  const { ctx, error } = useLoad(loadGoalTiles, "goals");
  const data = ctx?.data ?? null;
  return (
    <>
      <section className="card goals-head">
        <div className="eyebrow">Seven life goals</div>
        <h1>My goals</h1>
      </section>
      <ErrorNote error={error} />
      <div className="grid two">
        {GOALS.map((g) => {
          const count = data ? (data.monthCounts[g.id] ?? 0) : null;
          const ms = data ? data.milestones.filter((m) => m.goal_id === g.id) : [];
          const done = ms.filter((m) => m.done).length;
          const status = g.id === "money" && data?.moneyActive ? "Active · you chose to start" : g.status;
          const href = g.id === "trading" ? "/goals/finance-trading" : `/goals/${g.id}`;
          return (
            <Link
              key={g.id}
              href={href}
              className="card reveal goal-card goal-tile"
              style={{ "--tint": GOAL_TINT[g.id] } as CSSProperties}
            >
              <div className="goal-pic">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={GOAL_PIC[g.id]} alt="" loading="lazy" />
                <span className="goal-no">{g.no}</span>
              </div>
              <div className="goal-body">
                <div className="eyebrow">{status}</div>
                <h2 className="goal-name">{g.name}</h2>
                <p className="muted small goal-blurb">{g.blurb}</p>
                <div className="goal-foot">
                  <Ring count={count} label={`${count ?? 0} activities logged in the last 30 days, goal ${GOAL_MONTH_TARGET}`} />
                  <div className="goal-stats">
                    <span className="goal-stat-label">Activities logged</span>
                    <span className="small muted">last 30 days · goal {GOAL_MONTH_TARGET}</span>
                    {ms.length > 0 && <span className="small muted">{done} of {ms.length} milestones</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
