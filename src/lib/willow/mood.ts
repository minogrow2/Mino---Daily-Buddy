// Reads for the Mood page, and the rules the Mood and History scrapbooks share. Row-level security limits every query to the signed-in user.
import { createClient } from "@/lib/supabase/client";
import { plainOf } from "@/lib/notes";
import type { DayMood, MoodPhoto } from "./types";

const PAGE = 1000;
type Page<T> = { data: T[] | null; error: { message: string } | null };

/** Reads every row of a query in pages of 1000, so a long history is never cut short. */
export async function readAll<T>(read: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await read(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export type MoodPage = {
  moods: DayMood[];
  photos: MoodPhoto[];
  pins: string[];
  habitIds: string[];
  /** Habit ticks from `from` on (the 30-day comparison only). */
  checks: { day: string; habit_id: string }[];
  /** Screen minutes by day, from `from` on. Read only; the screen page owns writes. */
  screen: Record<string, number>;
};

/** Everything the Mood page shows. Habit ticks and screen time are read from `from` on: the 30-day comparison only. */
export async function loadMoodPage(from: string): Promise<MoodPage> {
  const sb = createClient();
  const [moods, photos, pins, habits, checks, screen] = await Promise.all([
    readAll<DayMood>((a, b) => sb.from("day_moods").select("day,mood,note,html").order("day").range(a, b)),
    readAll<MoodPhoto>((a, b) => sb.from("mood_photos").select("day,media_id,position").order("day").order("position").range(a, b)),
    readAll<{ day: string }>((a, b) => sb.from("day_pins").select("day").order("day").range(a, b)),
    readAll<{ id: string }>((a, b) => sb.from("habits").select("id").order("sort_order").range(a, b)),
    readAll<{ day: string; habit_id: string }>((a, b) => sb.from("habit_checks").select("day,habit_id").gte("day", from).order("day").range(a, b)),
    readAll<{ day: string; total_minutes: number }>((a, b) => sb.from("screen_days").select("day,total_minutes").gte("day", from).order("day").range(a, b)),
  ]);
  return {
    moods,
    photos,
    pins: pins.map((p) => p.day),
    habitIds: habits.map((h) => h.id),
    checks,
    screen: Object.fromEntries(screen.map((s) => [s.day, s.total_minutes])),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The rich text a day opens with: its saved HTML, or an older plain note as one paragraph. */
export const explainHtml = (row?: DayMood) => row?.html || (row?.note ? `<p>${esc(row.note)}</p>` : "");

/** Plain words of a day's explanation, for snippets and empty checks. */
export const textOf = (row?: DayMood) => (row?.html ? plainOf(row.html) : (row?.note ?? "").trim());

/** A day counts as logged when it has a mood, some writing or a photo. */
export const isLogged = (row: DayMood | undefined, photoCount: number) => !!(row?.mood || textOf(row) || photoCount > 0);

/** Replaces or adds one day in a list of day rows, the way the database upsert does. */
export function withDay(list: DayMood[], day: string, patch: Partial<DayMood>): DayMood[] {
  if (!list.some((m) => m.day === day)) return [...list, { day, mood: null, note: "", html: "", ...patch }];
  return list.map((m) => (m.day === day ? { ...m, ...patch } : m));
}

/** Pinned days first, then the rest. The rest shows 18 at a time until "show older" is pressed, as in the legacy app. */
export function splitPages(days: string[], pinned: Set<string>, showAll: boolean) {
  const pins = days.filter((d) => pinned.has(d));
  const rest = days.filter((d) => !pinned.has(d));
  const shown = showAll ? rest : rest.slice(0, 18);
  return { pinned: pins, shown, older: rest.length - shown.length };
}
