// Screen time: one row per day (total and social minutes) and its most used apps. Everything is stored in Supabase.
import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";

export type ScreenApp = { name: string; minutes: number };
export type ScreenDay = { day: string; total: number; social: number; apps: ScreenApp[] };

export const SCREEN_MAX_APPS = 8;

type DayRow = { day: string; total_minutes: number; social_minutes: number };
type AppRow = { day: string; name: string; minutes: number };

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** The n days ending on `end`, oldest first. Days with nothing logged are still listed here. */
export const rangeDays = (end: string, n: number) => Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));

/** Reads the apps for the given day rows and joins them on, keeping the saved order. */
async function withApps(rows: DayRow[]): Promise<ScreenDay[]> {
  if (!rows.length) return [];
  const days = rows.map((r) => r.day).sort();
  const { data, error } = await createClient()
    .from("screen_apps")
    .select("day,name,minutes")
    .gte("day", days[0])
    .lte("day", days[days.length - 1])
    .order("position", { ascending: true });
  fail(error);
  const apps = new Map<string, ScreenApp[]>();
  for (const a of (data ?? []) as AppRow[]) apps.set(a.day, [...(apps.get(a.day) ?? []), { name: a.name, minutes: a.minutes }]);
  return rows.map((r) => ({ day: r.day, total: r.total_minutes, social: r.social_minutes, apps: apps.get(r.day) ?? [] }));
}

/** Logged days between two calendar days (inclusive), newest first. */
export async function loadScreenRange(from: string, to: string): Promise<ScreenDay[]> {
  const { data, error } = await createClient()
    .from("screen_days")
    .select("day,total_minutes,social_minutes")
    .gte("day", from)
    .lte("day", to)
    .order("day", { ascending: false });
  fail(error);
  return withApps((data ?? []) as DayRow[]);
}

/** The most recent logged days, newest first, whatever their date. */
export async function loadRecentScreenDays(limit: number): Promise<ScreenDay[]> {
  const { data, error } = await createClient()
    .from("screen_days")
    .select("day,total_minutes,social_minutes")
    .order("day", { ascending: false })
    .limit(limit);
  fail(error);
  return withApps((data ?? []) as DayRow[]);
}

/**
 * Parses the "App name, minutes" lines the form takes: one app per line, at most eight.
 * The minutes follow the last comma, so an app name may itself contain a comma.
 */
export function parseApps(text: string): ScreenApp[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, SCREEN_MAX_APPS)
    .map((line) => {
      const cut = line.lastIndexOf(",");
      const name = (cut >= 0 ? line.slice(0, cut) : line).trim().slice(0, 60) || "App";
      const raw = cut >= 0 ? Number(line.slice(cut + 1)) : 0;
      return { name, minutes: Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0)) };
    });
}
