// Writes for the Me Time bucket list. Offline time uses addActivity and deleteActivity in actions.ts.
import { createClient } from "@/lib/supabase/client";
import type { BucketRow } from "./metime";

const newId = () => crypto.randomUUID();
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function addBucketItem(b: { title: string; category: string; note: string }): Promise<BucketRow> {
  const row: BucketRow = { id: newId(), title: b.title.slice(0, 140), category: b.category, note: b.note.slice(0, 300), done: false, done_day: null };
  fail((await createClient().from("bucket_items").insert(row)).error);
  return row;
}

/** Ticks an item off, with the day it was done (or clears both). */
export async function setBucketDone(id: string, done: boolean, doneDay: string | null): Promise<void> {
  fail((await createClient().from("bucket_items").update({ done, done_day: doneDay }).eq("id", id)).error);
}

export async function deleteBucketItem(id: string): Promise<void> {
  fail((await createClient().from("bucket_items").delete().eq("id", id)).error);
}
