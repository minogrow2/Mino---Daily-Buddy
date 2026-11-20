// Writes for the goal pages. Each one saves to Supabase and throws on error.
// Shared writes (log work, habit ticks, deleting habits and activities) are in ./actions.
import { createClient } from "@/lib/supabase/client";
import { todayYMD } from "@/lib/dates";
import type { GoalKey } from "./constants";
import type { CourseValues } from "./goals";

const newId = () => crypto.randomUUID();
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/* Milestones */
export async function addMilestone(goal: GoalKey, m: { title: string; horizon: string; due_day: string | null }) {
  fail((await createClient().from("milestones").insert({ id: newId(), goal_id: goal, done: false, ...m })).error);
}
export async function setMilestoneDone(id: string, done: boolean) {
  fail((await createClient().from("milestones").update({ done }).eq("id", id)).error);
}
export async function deleteMilestone(id: string) {
  fail((await createClient().from("milestones").delete().eq("id", id)).error);
}

/* Resources */
export async function addResource(goal: GoalKey, title: string, url: string) {
  fail((await createClient().from("resources").insert({ id: newId(), goal_id: goal, title, url })).error);
}
export async function updateResource(id: string, title: string, url: string) {
  fail((await createClient().from("resources").update({ title, url }).eq("id", id)).error);
}
export async function deleteResource(id: string) {
  fail((await createClient().from("resources").delete().eq("id", id)).error);
}

/* Workouts. As in the legacy app, a workout also counts as Glow Up activity. */
export async function addWorkout(w: { day: string; exercise: string; sets: number | null; reps: number | null; minutes: number }) {
  const sb = createClient();
  fail((await sb.from("workouts").insert({ id: newId(), ...w })).error);
  fail((await sb.from("activities").insert({
    id: newId(), day: w.day, category: "workout", goal_id: "glow", title: w.exercise, minutes: w.minutes, offline: false,
  })).error);
}
export async function deleteWorkout(id: string) {
  fail((await createClient().from("workouts").delete().eq("id", id)).error);
}

/* Self-care habits: a new one goes after the last habit, in the glow group. */
export async function addGlowHabit(title: string) {
  const sb = createClient();
  const { data, error } = await sb.from("habits").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  fail(error);
  const next = Number((data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;
  fail((await sb.from("habits").insert({ id: newId(), title, grp: "glow", custom: true, sort_order: next })).error);
}

/* Clothing orders */
export async function addClothingOrder(o: { item: string; store: string; order_day: string | null; status: string }) {
  fail((await createClient().from("clothing_orders").insert({ id: newId(), ...o })).error);
}
export async function setOrderStatus(id: string, status: string) {
  fail((await createClient().from("clothing_orders").update({ status }).eq("id", id)).error);
}
export async function deleteClothingOrder(id: string) {
  fail((await createClient().from("clothing_orders").delete().eq("id", id)).error);
}

/* Courses */
export async function addCourse(v: CourseValues) {
  fail((await createClient().from("courses").insert({ id: newId(), ...v })).error);
}
export async function updateCourse(id: string, v: CourseValues) {
  fail((await createClient().from("courses").update(v).eq("id", id)).error);
}
export async function setCourseStatus(id: string, status: string) {
  fail((await createClient().from("courses").update({ status }).eq("id", id)).error);
}
/** One more lesson done. Logged as Course study activity, as in the legacy app. */
export async function addCourseLesson(c: { id: string; name: string; lessons_done: number; lessons_total: number }) {
  if (c.lessons_done >= c.lessons_total) return;
  const sb = createClient();
  fail((await sb.from("courses").update({ lessons_done: c.lessons_done + 1 }).eq("id", c.id)).error);
  fail((await sb.from("activities").insert({
    id: newId(), day: todayYMD(), category: "cs", goal_id: "cs", title: `Lesson: ${c.name}`, minutes: 0, offline: false,
  })).error);
}
export async function deleteCourse(id: string) {
  fail((await createClient().from("courses").delete().eq("id", id)).error);
}

/* Internet Money: the decision. Activating it changes the label only. */
export async function setMoneyActive(on: boolean) {
  fail((await createClient().from("user_settings").upsert({ money_active: on }, { onConflict: "user_id" })).error);
}

/* AI sessions */
export async function addAiSession(s: {
  day: string; explored: string; learned: string; configured: string; built: string; problems: string; next_plan: string; minutes: number;
}) {
  const sb = createClient();
  const { minutes, ...text } = s;
  fail((await sb.from("ai_sessions").insert({ id: newId(), ...text })).error);
  // Also logged as AI activity, as in the legacy app, so the goal's time and 30-day count include it.
  fail((await sb.from("activities").insert({ id: newId(), day: s.day, category: "ai", goal_id: "ai", title: "AI session", minutes, offline: false, checklist: false })).error);
}
export async function deleteAiSession(id: string) {
  fail((await createClient().from("ai_sessions").delete().eq("id", id)).error);
}
