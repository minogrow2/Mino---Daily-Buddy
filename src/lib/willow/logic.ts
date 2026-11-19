// Pure Willow rules, shared by the Home page and the later pages. Nothing here touches the database.
import { addDays, weekday } from "@/lib/dates";
import { CATS, GOALS, MOOD_NOTES } from "./constants";
import type { Activity, HabitCheck, HomeData, JournalEntry, Habit } from "./types";

/** Monday of the week that contains this day. */
export const weekStart = (day: string) => {
  const d = weekday(day);
  return addDays(day, d === 0 ? -6 : 1 - d);
};

/** Minutes as "2h 05m" or "45m". */
export const hm = (min: number) => {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${String(r).padStart(2, "0")}m` : `${r}m`;
};

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const isCore = (h: Habit) => h.grp !== "glow";
export const coreHabits = (habits: Habit[]) => habits.filter(isCore).sort((a, b) => a.sort_order - b.sort_order);
export const glowHabits = (habits: Habit[]) => habits.filter((h) => h.grp === "glow").sort((a, b) => a.sort_order - b.sort_order);

export const checkedOn = (checks: HabitCheck[], day: string) => new Set(checks.filter((c) => c.day === day).map((c) => c.habit_id));
export const activitiesOn = (acts: Activity[], day: string) => acts.filter((a) => a.day === day);

/** How much a day holds: activities, habit ticks and journal entries. Drives the heatmap colour. */
export function dayScore(day: string, acts: Activity[], checks: HabitCheck[], journal: JournalEntry[]) {
  return activitiesOn(acts, day).length + checkedOn(checks, day).size + journal.filter((j) => j.day === day).length;
}
export const level = (score: number) => (score === 0 ? 0 : score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4);

/** Learning, health and offline time over the week up to this day. The three matter equally. */
export function weekAggregate(day: string, acts: Activity[], checks: HabitCheck[]) {
  const start = weekStart(day);
  const inWeek = acts.filter((a) => a.day >= start && a.day <= day);
  const learn = inWeek.filter((a) => CATS[a.category]?.learn || a.category === "reading");
  const health = inWeek.filter((a) => a.category === "workout");
  const habitTicks = checks.filter((c) => c.day >= start && c.day <= day).length;
  const offline = inWeek.filter((a) => CATS[a.category]?.offline);
  const sum = (xs: Activity[]) => xs.reduce((t, a) => t + a.minutes, 0);
  return {
    learning: { count: learn.length, minutes: sum(learn) },
    health: { count: health.length + habitTicks, minutes: sum(health) },
    personal: { count: offline.length, minutes: sum(offline) },
  };
}

/** Up to three gentle suggestions for today. Suggestions only; nothing is judged. */
export function minoTips(d: HomeData) {
  const t = d.today;
  const tips: string[] = [];
  const todayMood = d.moods.find((m) => m.day === t && m.mood);
  if (!todayMood) tips.push("How are you feeling today? A quick mood check-in helps me help you.");
  const checked = checkedOn(d.checks, t);
  const left = coreHabits(d.habits).filter((h) => !checked.has(h.id));
  if (left.length) tips.push(`Pick one small thing from your checklist, like “${left[0].title}”. One is enough.`);
  const todayTasks = d.tasks.filter((x) => x.day === t);
  if (todayTasks.some((x) => !x.done) && !todayTasks.some((x) => x.priority)) {
    tips.push("Star up to three tasks as today’s priorities. Everything else can wait.");
  }
  if (!d.lastOffline || t > addDays(d.lastOffline, 2)) {
    tips.push("It has been a little while since something offline. A walk, a coffee, or a call with a friend would count.");
  }
  if (todayMood && ["stressed", "tired", "sad"].includes(todayMood.mood ?? "")) {
    tips.push("Be gentle with yourself today. Choose one thing and let the rest go.");
  }
  if (!tips.length) tips.push("Nice rhythm today. Enjoy the rest of it outside the screen.");
  return tips.slice(0, 3);
}

/** The context Willow is given about the person. Journal text is added only when they allow it. */
export function willowContext(d: HomeData, journal: JournalEntry[]) {
  const t = d.today;
  const checked = checkedOn(d.checks, t);
  const core = coreHabits(d.habits);
  const open = d.tasks.filter((x) => x.day === t && !x.done).map((x) => x.title);
  const todayMood = d.moods.find((m) => m.day === t);
  const goals = GOALS.map((g) => {
    const ms = d.milestones.filter((m) => m.goal_id === g.id);
    return `${g.name}: ${ms.filter((m) => m.done).length}/${ms.length} milestones`;
  }).join("; ");
  let text = `Today is ${t} (Asia/Manila). Habits done today: ${core.filter((h) => checked.has(h.id)).length}/${core.length}. Open tasks: ${open.join(", ") || "none"}. Mood: ${todayMood?.mood ?? "not logged"}. Goals: ${goals}.`;
  if (d.chatJournal && journal.length) {
    const recent = journal
      .slice()
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 5)
      .map((j) => `${j.day} (${j.title || j.type}): ${String(j.body || "").slice(0, 400)}`)
      .join("\n");
    text += `\nRecent journal entries, which the person chose to share:\n${recent}`;
  }
  return text;
}

export const moodNoteFor = (mood: string | null | undefined) => (mood ? (MOOD_NOTES[mood] ?? "") : "");
export const goalName = (id: string | null | undefined) => GOALS.find((g) => g.id === id)?.name ?? "";
