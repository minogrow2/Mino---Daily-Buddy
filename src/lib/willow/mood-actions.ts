// Writes for the Mood page. Mood, explanation and photo writes live in actions.ts.
import { createClient } from "@/lib/supabase/client";

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Pins a day to the top of the scrapbook. History shares these pins. */
export async function setDayPin(day: string, on: boolean): Promise<void> {
  const sb = createClient();
  if (on) fail((await sb.from("day_pins").upsert({ day }, { onConflict: "user_id,day", ignoreDuplicates: true })).error);
  else fail((await sb.from("day_pins").delete().eq("day", day)).error);
}
