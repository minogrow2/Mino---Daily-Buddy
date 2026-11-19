// Writes for the Settings page. Each one saves to Supabase and throws on error. Chat journal uses setChatJournal in actions.ts.
import { createClient } from "@/lib/supabase/client";
import type { Colours, ThemeMode } from "./settings";

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/* Reads the whole extra object, changes some keys, and writes it back, so keys other pages keep are not lost. */
async function mergeExtra(change: (extra: Record<string, unknown>) => void) {
  const sb = createClient();
  const { data, error } = await sb.from("user_settings").select("extra").maybeSingle();
  fail(error);
  const extra: Record<string, unknown> = { ...((data?.extra as Record<string, unknown> | null) ?? {}) };
  change(extra);
  fail((await sb.from("user_settings").upsert({ extra }, { onConflict: "user_id" })).error);
}

export async function saveName(name: string) {
  await mergeExtra((e) => {
    e.name = name;
  });
}

/** Stored as extra.savingsTarget, the legacy key the Savings page reads. */
export async function saveSavingsTarget(target: number) {
  await mergeExtra((e) => {
    e.savingsTarget = target;
  });
}

/** Stored as extra.colors ({ big, small, main } hex), the legacy shape. An empty set removes the key. */
export async function saveColours(colours: Colours) {
  await mergeExtra((e) => {
    if (Object.keys(colours).length) e.colors = colours;
    else delete e.colors;
  });
}

export async function saveTheme(theme: ThemeMode) {
  fail((await createClient().from("user_settings").upsert({ theme }, { onConflict: "user_id" })).error);
}

export async function saveReminders(on: boolean) {
  fail((await createClient().from("user_settings").upsert({ reminders: on }, { onConflict: "user_id" })).error);
}

/** Sets or (for "") removes one scene key in the scenes column, keeping the others. */
export async function saveScene(page: "default" | "home", value: string) {
  const sb = createClient();
  const { data, error } = await sb.from("user_settings").select("scenes").maybeSingle();
  fail(error);
  const scenes: Record<string, unknown> = { ...((data?.scenes as Record<string, unknown> | null) ?? {}) };
  if (value === "") delete scenes[page];
  else scenes[page] = value;
  fail((await sb.from("user_settings").upsert({ scenes }, { onConflict: "user_id" })).error);
}
