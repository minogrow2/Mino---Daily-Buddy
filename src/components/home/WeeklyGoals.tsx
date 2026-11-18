"use client";

import Link from "next/link";
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

/** This week, Monday to Sunday: a tick per goal per day, and the life balance under it. */
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
    <>
      <Card eyebrow={`This week · ${range}`} title="Goal progress">
        <p className="-mt-2 mb-4 text-sm text-muted">Tap a day to log that goal. A filled circle means something was logged for it that day.</p>
        <ErrorNote error={err} />
        <ul className="space-y-4">
          {GOALS.map((g) => {
            const n = days.filter((d) => loggedOn(g.id, d)).length;
            return (
              <li key={g.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={g.id === "trading" ? "/goals/finance-trading" : "/goals"} className="flex items-center gap-2 font-medium hover:underline">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: GOAL_TINT[g.id] }} aria-hidden />
                    {g.name}
                  </Link>
                  <span className="text-sm text-muted">{n}/7 this week</span>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label={`${g.name}, this week`}>
                  {days.map((d, i) => {
                    const on = loggedOn(g.id, d);
                    const isToday = d === today;
                    const label = fmtDay(d, { weekday: "long", month: "short", day: "numeric" });
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${label}: ${on ? "logged" : "not logged"}`}
                        disabled={d > today}
                        onClick={() => toggle(g.id, d)}
                        className={`flex flex-col items-center gap-1 rounded-xl py-1 text-xs disabled:opacity-40 ${isToday ? "ring-2 ring-[var(--rose)]" : ""}`}
                      >
                        <span className="text-muted" aria-hidden>{DOW[i]}</span>
                        <span
                          aria-hidden
                          className="grid h-8 w-8 place-items-center rounded-full border-2 text-sm"
                          style={{ borderColor: GOAL_TINT[g.id], background: on ? GOAL_TINT[g.id] : "transparent" }}
                        >
                          {on ? "♥" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card eyebrow="This week" title="Life balance">
        <div className="grid grid-cols-3 gap-3">
          {balance.map((b) => (
            <div key={b.label} className="rounded-xl border border-line p-3" style={{ background: "var(--sage-fill)" }}>
              <p className="text-xs text-muted">{b.label}</p>
              <p className="font-display text-3xl leading-tight">{b.v.count}</p>
              <p className="text-xs text-muted">{hm(b.v.minutes)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">Last 7 days, Monday to today. All three matter equally.</p>
      </Card>
    </>
  );
}
