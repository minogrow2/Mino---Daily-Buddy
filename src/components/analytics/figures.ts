// The Analytics figures, worked out from the rows read for one range. Nothing here is scored, ranked or compared between people or days.
import { addDays, fmtDay } from "@/lib/dates";
import { CATS, GOALS } from "@/lib/willow/constants";
import type { AnalyticsRows, CourseRow } from "@/lib/willow/analytics";
import { pct, weekStart } from "@/lib/willow/logic";

const COURSE_STATUS = ["Not started", "In progress", "Completed"];

/** Pesos as the legacy app wrote them: whole pesos, a thousands separator, and a minus sign before the peso sign. */
export function php(n: number) {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? "−" : ""}₱${Math.abs(v).toLocaleString("en-PH")}`;
}

/** Courses saved before the status field existed read their status from the lesson count. */
export function courseStatus(c: CourseRow) {
  if (COURSE_STATUS.includes(c.status)) return c.status;
  if (c.lessons_total && c.lessons_done >= c.lessons_total) return "Completed";
  return c.lessons_done > 0 ? "In progress" : "Not started";
}

export type Figures = {
  hasRecords: boolean;
  labels: string[];
  planned: number[];
  completed: number[];
  habitShare: number[];
  learnMinutes: number[];
  screenMinutes: number[];
  weeks: { label: string; planned: number; completed: number }[];
  consistency: { label: string; text: string }[];
  goals: { id: string; name: string; done: number; total: number }[];
  growth: string[];
  courses: string;
  projectsDone: number;
  savings: number;
};

/** Rows grouped by their day, keeping the order they were read in. */
function byDay<T extends { day: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const list = map.get(r.day);
    if (list) list.push(r);
    else map.set(r.day, [r]);
  }
  return map;
}

/** Every figure the Analytics page shows, for the `range` days ending on `today`. */
export function buildFigures(rows: AnalyticsRows, today: string, range: number): Figures {
  const days = Array.from({ length: range }, (_, i) => addDays(today, i - (range - 1)));
  const ofRange = (n: number) => `${n} of ${range} days`;
  const countDays = (pred: (d: string) => boolean) => days.filter(pred).length;

  const tasks = byDay(rows.tasks);
  const checks = byDay(rows.checks);
  const acts = byDay(rows.activities);
  const screen = new Map(rows.screen.map((s) => [s.day, s.total_minutes]));

  const known = new Set(rows.habits.map((h) => h.id));
  const core = new Set(rows.habits.filter((h) => h.grp !== "glow").map((h) => h.id));
  const dayTasks = (d: string) => tasks.get(d) ?? [];
  const dayActs = (d: string) => acts.get(d) ?? [];
  const ticked = (d: string) => new Set((checks.get(d) ?? []).map((c) => c.habit_id).filter((id) => known.has(id)));
  const isLearn = (cat: string) => !!CATS[cat]?.learn;
  const isOffline = (cat: string) => !!CATS[cat]?.offline;
  const hasCat = (cat: string) => (d: string) => dayActs(d).some((a) => a.category === cat);
  const offlineDay = (d: string) => dayActs(d).some((a) => isOffline(a.category));
  const learnDay = (d: string) => dayActs(d).some((a) => isLearn(a.category));

  const labels = days.map((d) => fmtDay(d, { month: "numeric", day: "numeric" }));
  const planned = days.map((d) => dayTasks(d).length);
  const completed = days.map((d) => dayTasks(d).filter((t) => t.done).length);
  // Habits are measured on the core ones only; the glow habits are not part of this share.
  const habitShare = days.map((d) => pct([...ticked(d)].filter((id) => core.has(id)).length, core.size));
  const learnMinutes = days.map((d) =>
    Math.round(dayActs(d).filter((a) => isLearn(a.category)).reduce((s, a) => s + (a.minutes || 0), 0)),
  );
  const screenMinutes = days.map((d) => Math.round(screen.get(d) ?? 0));

  // The last four Monday-to-Sunday weeks, oldest first. The last one is the week that holds today.
  const thisWeek = weekStart(today);
  const weeks = [3, 2, 1, 0].map((k) => {
    const end = addDays(thisWeek, -7 * k + 6);
    const first = addDays(end, -6);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(first, i));
    return {
      label: `${fmtDay(first, { month: "short", day: "numeric" })} – ${fmtDay(end, { month: "short", day: "numeric" })}`,
      planned: weekDays.reduce((s, d) => s + dayTasks(d).length, 0),
      completed: weekDays.reduce((s, d) => s + dayTasks(d).filter((t) => t.done).length, 0),
    };
  });

  const consistency = [
    { label: "AI learning", text: ofRange(countDays(hasCat("ai"))) },
    { label: "Trading education", text: ofRange(countDays(hasCat("trading"))) },
    { label: "Workouts", text: ofRange(countDays(hasCat("workout"))) },
    { label: "Reading or watching", text: ofRange(countDays(hasCat("reading"))) },
    { label: "Offline activities", text: ofRange(countDays(offlineDay)) },
  ];

  const goals = GOALS.map((g) => {
    const ms = rows.milestones.filter((m) => m.goal_id === g.id);
    return { id: g.id, name: g.name, done: ms.filter((m) => m.done).length, total: ms.length };
  });

  const savings = rows.savings.reduce((t, s) => t + (s.kind === "deposit" ? s.amount : -s.amount), 0);
  const courses = rows.courses.length
    ? `${rows.courses.filter((c) => courseStatus(c) === "Completed").length} of ${rows.courses.length} completed`
    : "No courses yet";
  const projectsDone = rows.projects.filter((p) => p.status === "Completed").length;

  const growth = [
    `Habits: ${ofRange(countDays((d) => ticked(d).size > 0))} with at least one habit checked.`,
    `Learning: ${ofRange(countDays(learnDay))} with learning time.`,
    `Offline: ${ofRange(countDays(offlineDay))} with something done outside the screen.`,
    `Savings: ${php(savings)} saved in total, across ${rows.savings.length} records.`,
  ];

  return {
    hasRecords: rows.hasRecords,
    labels,
    planned,
    completed,
    habitShare,
    learnMinutes,
    screenMinutes,
    weeks,
    consistency,
    goals,
    growth,
    courses,
    projectsDone,
    savings,
  };
}
