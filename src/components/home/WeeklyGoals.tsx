"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { fmtDay, addDays } from "@/lib/dates";
import { GOALS, GOAL_TINT, GOAL_CAT } from "@/lib/willow/constants";
import { setGoalDay } from "@/lib/willow/actions";
import { hm, weekAggregate, weekStart } from "@/lib/willow/logic";
import type { Activity } from "@/lib/willow/types";
import type { HomeCtx } from "./context";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** This week, Monday to Sunday: a circle per goal per day, and the life balance beside it. */
export function WeeklyGoals({ ctx }: { ctx: HomeCtx }) {
  const { data, edit, reload } = ctx;
  const today = data.today;
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const range = `${fmtDay(start, { month: "short", day: "numeric" })} – ${fmtDay(days[6], { month: "short", day: "numeric" })}`;
  const [err, setErr] = useState<string | null>(null);

  const loggedOn = (goalId: string, day: string) => data.activities.some((a) => a.goal_id === goalId && a.day === day);

  function toggle(goalId: string, day: string) {
    if (day > today) return;
    const goal = GOALS.find((g) => g.id === goalId);
    if (!goal) return;
    const mine = data.activities.filter((a) => a.goal_id === goalId && a.day === day);
    const ticked = mine.some((a) => a.checklist);
    if (!ticked && mine.length) {
      setErr(`${goal.name} is logged on its goal page for that day. Delete it there to untick the day.`);
      return;
    }
    setErr(null);
    const on = !ticked;
    edit((d) => ({
      ...d,
      activities: on
        ? [
            ...d.activities,
            {
              id: `pending-${goalId}-${day}`, day, category: GOAL_CAT[goal.id], goal_id: goal.id, title: goal.name,
              minutes: 0, offline: false, note: "", checklist: true, me_key: "",
            } as Activity,
          ]
        : d.activities.filter((a) => !(a.goal_id === goalId && a.day === day && a.checklist)),
    }));
    setGoalDay(day, goalId, goal.name, on).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  const wk = weekAggregate(today, data.activities, data.checks);
  const balance = [
    { label: "Learning", v: wk.learning },
    { label: "Health", v: wk.health },
    { label: "Life", v: wk.personal },
  ];

  return (
    <div className="grid two">
      <div style={{ gridColumn: "1 / -1" }}>
        <Card
          id="goal-week"
          eyebrow={`This week · ${range}`}
          title="Goal progress"
          right={
            <Link className="small" href="/goals">
              All goals
            </Link>
          }
        >
          <p className="small muted" style={{ marginTop: -4 }}>
            Tap a day to log that goal. A filled circle means something was logged for it that day.
          </p>
          <ErrorNote error={err} />
          <div className="wk-list">
            {GOALS.map((g) => {
              const n = days.filter((d) => loggedOn(g.id, d)).length;
              return (
                <div key={g.id} className="wk-goal" style={{ "--tint": GOAL_TINT[g.id] } as CSSProperties}>
                  <div className="wk-head">
                    <Link className="wk-name" href={g.id === "trading" ? "/goals/finance-trading" : "/goals"}>
                      <span className="wk-tint" aria-hidden="true" />
                      {g.name}
                    </Link>
                    <span className="small muted">{n}/7 this week</span>
                  </div>
                  <div className="wk-days" role="group" aria-label={`${g.name}, this week`}>
                    {days.map((d, i) => {
                      const on = loggedOn(g.id, d);
                      const label = fmtDay(d, { weekday: "long", month: "short", day: "numeric" });
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`wk-day${on ? " on" : ""}${d === today ? " today" : ""}`}
                          aria-pressed={on}
                          aria-label={`${label}: ${on ? "logged" : "not logged"}`}
                          disabled={d > today}
                          onClick={() => toggle(g.id, d)}
                        >
                          <span className="wk-dow" aria-hidden="true">
                            {DOW[i]}
                          </span>
                          <span className="wk-circle" aria-hidden="true">
                            {on ? "♥" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card eyebrow="This week" title="Life balance">
        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {balance.map((b) => (
            <div key={b.label} className="stat">
              <div className="small muted">{b.label}</div>
              <div className="v">{b.v.count}</div>
              <div className="small muted">{hm(b.v.minutes)}</div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Last 7 days, Monday to today. All three matter equally.
        </p>
      </Card>
    </div>
  );
}
