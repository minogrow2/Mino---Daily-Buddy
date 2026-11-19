// Writes for screen time. Each one saves to Supabase and throws on error.
import { createClient } from "@/lib/supabase/client";
import { SCREEN_MAX_APPS, type ScreenApp } from "./screen";

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/**
 * Saves one day: its totals and its apps (replacing the old list). When `moveFrom` names another day,
 * that day's row is removed, so a changed date moves the record instead of copying it.
 */
export async function saveScreenDay(d: {
  day: string;
  total: number;
  social: number;
  apps: ScreenApp[];
  moveFrom: string | null;
}): Promise<void> {
  const sb = createClient();
  if (d.moveFrom && d.moveFrom !== d.day) fail((await sb.from("screen_days").delete().eq("day", d.moveFrom)).error);
  fail(
    (
      await sb.from("screen_days").upsert(
        { day: d.day, total_minutes: d.total, social_minutes: d.social, demo: false, updated_at: new Date().toISOString() },
        { onConflict: "user_id,day" },
      )
    ).error,
  );
  fail((await sb.from("screen_apps").delete().eq("day", d.day)).error);
  if (d.apps.length) {
    fail(
      (
        await sb
          .from("screen_apps")
          .insert(d.apps.slice(0, SCREEN_MAX_APPS).map((a, position) => ({ day: d.day, position, name: a.name, minutes: a.minutes })))
      ).error,
    );
  }
}

/** Removes a day. Its apps go with it (database cascade). */
export async function deleteScreenDay(day: string): Promise<void> {
  fail((await createClient().from("screen_days").delete().eq("day", day)).error);
}
