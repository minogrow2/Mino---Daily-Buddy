// Reads for the Me Time page: offline time and the 100-things bucket list.
import { createClient } from "@/lib/supabase/client";
import { readAll } from "./mood";

/** Gentle prompts, one each day, as in the legacy Me Time page. */
export const REMINDERS = [
  "Have you done something fun today that doesn’t involve your phone?",
  "Is there a walk you could take before dinner?",
  "Who could you message to plan something this week?",
  "What is one thing outside that you noticed today?",
  "Could you spend fifteen minutes doing nothing in particular?",
];

export const BUCKET_CATS = ["Places", "Experiences", "Food", "Outdoors", "Social", "Hobbies"];

export type OfflineRow = { id: string; day: string; title: string; minutes: number; category: string; me_key: string };
export type BucketRow = { id: string; title: string; category: string; note: string; done: boolean; done_day: string | null };

/** Every offline activity, newest first (Me Time ticks are offline activities too). */
export async function loadOffline(): Promise<OfflineRow[]> {
  const sb = createClient();
  return readAll<OfflineRow>((a, b) =>
    sb.from("activities").select("id,day,title,minutes,category,me_key").eq("offline", true).order("day", { ascending: false }).range(a, b),
  );
}

/** The bucket list in the order it was added. */
export async function loadBucket(): Promise<BucketRow[]> {
  const { data, error } = await createClient()
    .from("bucket_items")
    .select("id,title,category,note,done,done_day")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as BucketRow[];
}
