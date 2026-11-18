// Reads for the Home page. Every query is limited to the signed-in user by row-level security.
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_HABITS } from "./constants";
import { weekStart } from "./logic";
import type { ChatMsg, DayMood, EventItem, Habit, HabitCheck, HomeData, JournalEntry, Milestone, MoodPhoto, Activity, Task, YearRows } from "./types";

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Last calendar day of a YYYY-MM month, as YYYY-MM-DD. */
export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** Everything the Home page needs for today, this week and the chosen month. */
export async function loadHome(today: string, month: string): Promise<HomeData> {
  const sb = createClient();
  const first = `${month}-01`;
  const last = monthEnd(month);
  const weekFrom = weekStart(today);
  // Tasks, events and activities cover this week, today and the month shown (whichever reaches further).
  const from = [weekFrom, first, today].sort()[0];
  const to = [today, last].sort().reverse()[0];

  const [habits, checks, tasks, events, milestones, acts, moods, photos, offline, chat, settings] = await Promise.all([
    sb.from("habits").select("id,title,grp,custom,sort_order").order("sort_order"),
    sb.from("habit_checks").select("day,habit_id").gte("day", weekFrom).lte("day", today),
    sb.from("tasks").select("id,day,title,done,priority,sort_order").gte("day", from).lte("day", to).order("sort_order"),
    sb.from("events").select("id,day,title,time_of_day").gte("day", from).lte("day", to),
    sb.from("milestones").select("id,goal_id,title,due_day,done"),
    sb.from("activities").select("id,day,category,goal_id,title,minutes,offline,note,checklist,me_key").gte("day", from).lte("day", to),
    sb.from("day_moods").select("day,mood,note,html").eq("day", today),
    sb.from("mood_photos").select("day,media_id,position").eq("day", today).order("position"),
    sb.from("activities").select("day").eq("offline", true).order("day", { ascending: false }).limit(1),
    sb.from("chat_messages").select("id,role,body,created_at").order("created_at", { ascending: false }).limit(60),
    sb.from("user_settings").select("chat_journal,extra").maybeSingle(),
  ]);
  for (const r of [habits, checks, tasks, events, milestones, acts, moods, photos, offline, chat, settings]) fail(r.error);

  let habitRows = (habits.data ?? []) as Habit[];
  if (!habitRows.length) {
    // First visit: the default habits are written once, so they can be edited and removed like any other.
    const seed = DEFAULT_HABITS.map((h, i) => ({ id: h.id, title: h.title, grp: h.grp, custom: false, sort_order: i + 1 }));
    fail((await sb.from("habits").insert(seed)).error);
    habitRows = seed;
  }

  const extra = (settings.data?.extra ?? {}) as { name?: string };
  return {
    today,
    habits: habitRows,
    checks: (checks.data ?? []) as HabitCheck[],
    tasks: (tasks.data ?? []) as Task[],
    events: (events.data ?? []) as EventItem[],
    milestones: (milestones.data ?? []) as Milestone[],
    activities: (acts.data ?? []) as Activity[],
    moods: (moods.data ?? []) as DayMood[],
    moodPhotos: (photos.data ?? []) as MoodPhoto[],
    lastOffline: (offline.data?.[0]?.day as string | undefined) ?? null,
    chat: ((chat.data ?? []) as ChatMsg[]).reverse(),
    name: extra.name ?? "",
    chatJournal: !!settings.data?.chat_journal,
  };
}

/** Day-only rows for one calendar year, for the heatmap. */
export async function loadYear(year: number): Promise<YearRows> {
  const sb = createClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [acts, checks, journal] = await Promise.all([
    sb.from("activities").select("day").gte("day", from).lte("day", to),
    sb.from("habit_checks").select("day").gte("day", from).lte("day", to),
    sb.from("journal_entries").select("day").gte("day", from).lte("day", to),
  ]);
  for (const r of [acts, checks, journal]) fail(r.error);
  return {
    activityDays: (acts.data ?? []).map((r) => r.day as string),
    checkDays: (checks.data ?? []).map((r) => r.day as string),
    journalDays: (journal.data ?? []).map((r) => r.day as string),
  };
}

/** Journal entries for the Willow context, only read when the person has allowed it. */
export async function loadRecentJournal(): Promise<JournalEntry[]> {
  const { data, error } = await createClient()
    .from("journal_entries")
    .select("id,day,type,title,body,html,tags,favorite")
    .order("day", { ascending: false })
    .limit(5);
  fail(error);
  return (data ?? []) as JournalEntry[];
}

/** Everything recorded on one day, for the day summary opened from the heatmap. */
export async function loadDay(day: string) {
  const sb = createClient();
  const [habits, checks, acts, tasks, journal, mood] = await Promise.all([
    sb.from("habits").select("id,title,grp").order("sort_order"),
    sb.from("habit_checks").select("habit_id").eq("day", day),
    sb.from("activities").select("id,category,goal_id,title,minutes,me_key,checklist").eq("day", day),
    sb.from("tasks").select("id,title,done").eq("day", day).order("sort_order"),
    sb.from("journal_entries").select("id,title,body,html,type").eq("day", day),
    sb.from("day_moods").select("mood,html,note").eq("day", day).maybeSingle(),
  ]);
  for (const r of [habits, checks, acts, tasks, journal, mood]) fail(r.error);
  return {
    habits: (habits.data ?? []) as { id: string; title: string; grp: string }[],
    checkedIds: (checks.data ?? []).map((r) => r.habit_id as string),
    activities: (acts.data ?? []) as { id: string; category: string; goal_id: string | null; title: string; minutes: number; me_key: string; checklist: boolean }[],
    tasks: (tasks.data ?? []) as { id: string; title: string; done: boolean }[],
    journal: (journal.data ?? []) as { id: string; title: string; body: string; html: string | null; type: string }[],
    mood: (mood.data ?? null) as { mood: string | null; html: string; note: string } | null,
  };
}
