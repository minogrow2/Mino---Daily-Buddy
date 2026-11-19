// Reads and rules for History: every logged day as a page, and the concise review of one day.
import { createClient } from "@/lib/supabase/client";
import { fmtDay } from "@/lib/dates";
import { plainOf } from "@/lib/notes";
import { moodOf } from "./constants";
import { loadDay, loadDayPhotos } from "./data";
import { readAll, textOf } from "./mood";
import type { DayMood, MoodPhoto } from "./types";

export type HistoryIndex = {
  moods: DayMood[];
  photos: MoodPhoto[];
  pins: string[];
  journal: { day: string; title: string; body: string; html: string | null; type: string; tags: string[] }[];
  activities: { day: string; title: string; note: string; minutes: number; category: string; goal_id: string | null; me_key: string; checklist: boolean }[];
  checks: { day: string; habit_id: string }[];
  habitIds: string[];
  doneTasks: { day: string; title: string }[];
  screenDays: string[];
};

/** Every row History needs to list logged days and search them. Read in pages, so nothing is cut short. */
export async function loadHistoryIndex(): Promise<HistoryIndex> {
  const sb = createClient();
  const [moods, photos, pins, journal, activities, checks, habits, tasks, screen] = await Promise.all([
    readAll<DayMood>((a, b) => sb.from("day_moods").select("day,mood,note,html").order("day").range(a, b)),
    readAll<MoodPhoto>((a, b) => sb.from("mood_photos").select("day,media_id,position").order("day").order("position").range(a, b)),
    readAll<{ day: string }>((a, b) => sb.from("day_pins").select("day").order("day").range(a, b)),
    readAll<HistoryIndex["journal"][number]>((a, b) => sb.from("journal_entries").select("day,title,body,html,type,tags").order("created_at").range(a, b)),
    readAll<HistoryIndex["activities"][number]>((a, b) => sb.from("activities").select("day,title,note,minutes,category,goal_id,me_key,checklist").order("day").range(a, b)),
    readAll<{ day: string; habit_id: string }>((a, b) => sb.from("habit_checks").select("day,habit_id").order("day").range(a, b)),
    readAll<{ id: string }>((a, b) => sb.from("habits").select("id").order("sort_order").range(a, b)),
    readAll<{ day: string; title: string }>((a, b) => sb.from("tasks").select("day,title").eq("done", true).order("day").range(a, b)),
    readAll<{ day: string }>((a, b) => sb.from("screen_days").select("day").order("day").range(a, b)),
  ]);
  return {
    moods,
    photos,
    pins: pins.map((p) => p.day),
    journal,
    activities,
    checks,
    habitIds: habits.map((h) => h.id),
    doneTasks: tasks,
    screenDays: screen.map((s) => s.day),
  };
}

export type HistoryMaps = {
  /** Logged days, newest first. */
  days: string[];
  moodBy: Map<string, DayMood>;
  photosBy: Map<string, MoodPhoto[]>;
  pins: Set<string>;
  /** Activities, habit ticks and journal entries on the day (the legacy day score). */
  score: Map<string, number>;
  snippet: Map<string, string>;
  /** Lower-case text the search matches against. */
  search: Map<string, string>;
};

function group<T extends { day: string }>(rows: T[]) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const list = m.get(r.day);
    if (list) list.push(r);
    else m.set(r.day, [r]);
  }
  return m;
}

/** Turns the index into per-day lookups. Built once per load, so the search and the cards stay quick. */
export function buildMaps(ix: HistoryIndex): HistoryMaps {
  const moodBy = new Map(ix.moods.map((m) => [m.day, m] as const));
  const photosBy = group(ix.photos);
  const journalBy = group(ix.journal);
  const actsBy = group(ix.activities);
  const tasksBy = group(ix.doneTasks);
  const habitIds = new Set(ix.habitIds);
  const checksBy = new Map<string, Set<string>>();
  for (const c of ix.checks) {
    if (!habitIds.has(c.habit_id)) continue;
    const s = checksBy.get(c.day) ?? new Set<string>();
    s.add(c.habit_id);
    checksBy.set(c.day, s);
  }

  const days = new Set<string>();
  for (const m of ix.moods) if (m.mood || textOf(m) || photosBy.has(m.day)) days.add(m.day);
  for (const d of photosBy.keys()) days.add(d);
  for (const j of ix.journal) days.add(j.day);
  for (const a of ix.activities) days.add(a.day);
  for (const c of ix.checks) days.add(c.day);
  for (const t of ix.doneTasks) days.add(t.day);
  for (const d of ix.screenDays) days.add(d);
  const list = [...days].filter(Boolean).sort((a, b) => (a < b ? 1 : -1));

  const score = new Map<string, number>();
  const snippet = new Map<string, string>();
  const search = new Map<string, string>();
  for (const d of list) {
    const journal = journalBy.get(d) ?? [];
    const mood = moodBy.get(d);
    score.set(d, (actsBy.get(d)?.length ?? 0) + (checksBy.get(d)?.size ?? 0) + journal.length);

    const first = journal.find((j) => j.html || j.body);
    const written = first ? (first.html ? plainOf(first.html) : first.body.trim()) : "";
    snippet.set(d, (written || textOf(mood)).slice(0, 140));

    search.set(
      d,
      [
        fmtDay(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        moodOf(mood?.mood)?.label ?? "",
        textOf(mood),
        ...journal.map((j) => `${j.title} ${j.html ? plainOf(j.html) : j.body} ${j.tags.join(" ")}`),
        ...(actsBy.get(d) ?? []).map((a) => `${a.title} ${a.note}`),
        ...(tasksBy.get(d) ?? []).map((t) => t.title),
      ]
        .join(" ")
        .toLowerCase(),
    );
  }
  return { days: list, moodBy, photosBy, pins: new Set(ix.pins), score, snippet, search };
}

/** One day for the History review: its mood, photos, habits, activities, tasks, journal and screen minutes. */
export async function loadHistoryDay(day: string) {
  const sb = createClient();
  const [detail, photos, screen] = await Promise.all([
    loadDay(day),
    loadDayPhotos(day),
    sb.from("screen_days").select("total_minutes").eq("day", day).maybeSingle(),
  ]);
  if (screen.error) throw new Error(screen.error.message);
  return { detail, photos, screenMinutes: (screen.data?.total_minutes as number | undefined) ?? null };
}
