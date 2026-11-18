// Writes for the Home page. Each one saves to Supabase; the page updates its own copy first, then keeps it if the save worked.
import { createClient } from "@/lib/supabase/client";
import { deleteMedia, uploadImage } from "@/lib/media";
import { CATS, GOAL_CAT, ME_TIME } from "./constants";
import type { ChatMsg } from "./types";

const newId = () => crypto.randomUUID();
const fail = (e: { message: string; code?: string } | null) => {
  if (e) throw new Error(e.message);
};

/* Habit ticks */
export async function setHabitCheck(day: string, habitId: string, on: boolean) {
  const sb = createClient();
  if (on) fail((await sb.from("habit_checks").upsert({ day, habit_id: habitId }, { onConflict: "user_id,day,habit_id", ignoreDuplicates: true })).error);
  else fail((await sb.from("habit_checks").delete().eq("day", day).eq("habit_id", habitId)).error);
}

/* Habits: the list, its order and the custom ones */
export async function addHabit(title: string, nextOrder: number) {
  const row = { id: newId(), title, grp: "custom", custom: true, sort_order: nextOrder };
  fail((await createClient().from("habits").insert(row)).error);
  return row;
}
export async function renameHabit(id: string, title: string) {
  fail((await createClient().from("habits").update({ title }).eq("id", id)).error);
}
export async function deleteHabit(id: string) {
  fail((await createClient().from("habits").delete().eq("id", id).eq("custom", true)).error);
}
export async function swapOrder(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
  const sb = createClient();
  fail((await sb.from("habits").update({ sort_order: b.sort_order }).eq("id", a.id)).error);
  fail((await sb.from("habits").update({ sort_order: a.sort_order }).eq("id", b.id)).error);
}

/* Tasks: today’s list, the three priorities, and tasks planned on any day */
export async function addTask(day: string, title: string, sortOrder: number) {
  const row = { id: newId(), day, title, done: false, priority: false, sort_order: sortOrder };
  fail((await createClient().from("tasks").insert(row)).error);
  return row;
}
export async function patchTask(id: string, patch: { title?: string; done?: boolean; priority?: boolean }) {
  fail((await createClient().from("tasks").update(patch).eq("id", id)).error);
}
export async function deleteTask(id: string) {
  fail((await createClient().from("tasks").delete().eq("id", id)).error);
}
export async function swapTaskOrder(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
  const sb = createClient();
  fail((await sb.from("tasks").update({ sort_order: b.sort_order }).eq("id", a.id)).error);
  fail((await sb.from("tasks").update({ sort_order: a.sort_order }).eq("id", b.id)).error);
}

/* Events on a day */
export async function addEvent(day: string, title: string, time: string) {
  const row = { id: newId(), day, title, time_of_day: time || null };
  fail((await createClient().from("events").insert(row)).error);
  return row;
}
export async function deleteEvent(id: string) {
  fail((await createClient().from("events").delete().eq("id", id)).error);
}

/* Me Time: one tick per item per day. Each tick is an offline activity. */
export async function setMeTime(day: string, key: string, on: boolean) {
  const sb = createClient();
  if (on) {
    const item = ME_TIME.find((m) => m.key === key);
    if (!item) return;
    const { error } = await sb.from("activities").insert({
      id: newId(), day, category: item.category, title: item.label, minutes: 0,
      offline: !!CATS[item.category]?.offline, me_key: key,
    });
    // A second tick for the same item on the same day is already saved; that is fine.
    if (error && error.code !== "23505") throw new Error(error.message);
  } else {
    fail((await sb.from("activities").delete().eq("day", day).eq("me_key", key)).error);
  }
}

/* Weekly goal ticks: one checklist activity per goal per day */
export async function setGoalDay(day: string, goalId: string, goalName: string, on: boolean) {
  const sb = createClient();
  if (on) {
    fail((await sb.from("activities").insert({
      id: newId(), day, category: GOAL_CAT[goalId as keyof typeof GOAL_CAT] ?? "personal", goal_id: goalId,
      title: goalName, minutes: 0, checklist: true, offline: false,
    })).error);
  } else {
    fail((await sb.from("activities").delete().eq("day", day).eq("goal_id", goalId).eq("checklist", true)).error);
  }
}

/* Mood of a day, its written explanation and its photos */
export async function setMood(day: string, mood: string) {
  fail((await createClient().from("day_moods").upsert({ day, mood }, { onConflict: "user_id,day" })).error);
}
export async function saveMoodHtml(day: string, html: string) {
  fail((await createClient().from("day_moods").upsert({ day, html }, { onConflict: "user_id,day" })).error);
}
export async function addMoodPhoto(day: string, file: File, position: number) {
  const mediaId = await uploadImage(file);
  fail((await createClient().from("mood_photos").insert({ day, media_id: mediaId, position })).error);
  return mediaId;
}
export async function removeMoodPhoto(day: string, mediaId: string) {
  fail((await createClient().from("mood_photos").delete().eq("day", day).eq("media_id", mediaId)).error);
  await deleteMedia(mediaId);
}

/* Journal writes from Home */
export async function saveQuickJournal(day: string, html: string, body: string) {
  fail((await createClient().from("journal_entries").insert({
    id: newId(), day, type: "daily", title: "Today", body, html, tags: [], favorite: false,
  })).error);
}
export async function saveReflection(day: string, lines: { learned: string; done: string; enjoyed: string }) {
  const body = `Learned: ${lines.learned}\nAccomplished: ${lines.done}\nEnjoyed: ${lines.enjoyed}`.trim();
  fail((await createClient().from("journal_entries").insert({
    id: newId(), day, type: "daily", title: "Evening reflection", body, html: null, tags: ["reflection"], favorite: false,
  })).error);
}

/* Settings the Home page reads */
export async function setChatJournal(on: boolean) {
  fail((await createClient().from("user_settings").upsert({ chat_journal: on }, { onConflict: "user_id" })).error);
}

/* Willow chat: the person’s message is saved first, then the reply (or the reason there is none). */
export async function saveChatMessage(role: "me" | "mino" | "note", body: string): Promise<ChatMsg> {
  const row = { id: newId(), role, body, created_at: new Date().toISOString() };
  fail((await createClient().from("chat_messages").insert(row)).error);
  return row;
}

export type WillowReply = { text: string } | { error: "not_configured" | "rate_limited" | "failed" };
export async function askWillow(messages: { role: "user" | "assistant"; content: string }[], context: string): Promise<WillowReply> {
  const res = await fetch("/api/willow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });
  const data = (await res.json().catch(() => ({}))) as WillowReply;
  if (!res.ok && !("error" in data)) return { error: "failed" };
  return data;
}

/** Deletes the whole conversation with Willow for this account. */
export async function clearChat() {
  fail((await createClient().from("chat_messages").delete().not("id", "is", null)).error);
}
