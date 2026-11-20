// Reads for the goal pages. Every query is limited to the signed-in user by row-level security.
import { createClient } from "@/lib/supabase/client";
import { addDays, todayYMD } from "@/lib/dates";
import { DEFAULT_HABITS, type GoalKey } from "./constants";

export const HORIZONS = ["Weekly", "Short-term", "Monthly", "Long-term"] as const;
export const ORDER_STATUS = ["Ordered", "Shipped", "Arrived", "Kept", "Returned"] as const;
export const COURSE_STATUS = ["Not started", "In progress", "Completed"] as const;

export type GoalMilestone = { id: string; goal_id: string; title: string; horizon: string; due_day: string | null; done: boolean };
export type GoalResource = { id: string; goal_id: string; title: string; url: string };
export type GoalActivity = { id: string; day: string; category: string; goal_id: string | null; title: string; minutes: number; checklist: boolean };
export type GoalPageData = {
  today: string;
  milestones: GoalMilestone[];
  activities: GoalActivity[];
  resources: GoalResource[];
  moneyActive: boolean;
};
export type GlowHabit = { id: string; title: string; grp: string; sort_order: number };
export type Workout = { id: string; day: string; exercise: string; sets: number | null; reps: number | null; minutes: number };
export type ClothingOrder = { id: string; item: string; store: string; order_day: string | null; status: string };
export type GlowData = { today: string; habits: GlowHabit[]; checkedIds: string[]; workouts: Workout[]; orders: ClothingOrder[] };
export type Course = {
  id: string; name: string; platform: string; lessons_total: number; lessons_done: number;
  status: string; started_on: string | null; certificate: boolean;
};

export type CourseValues = {
  name: string; platform: string; lessons_total: number; lessons_done: number;
  status: string; started_on: string | null; certificate: boolean;
};

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Whether Internet Money has been activated. It only changes the label. */
export async function loadMoneyActive(): Promise<boolean> {
  const { data, error } = await createClient().from("user_settings").select("money_active").maybeSingle();
  fail(error);
  return !!(data as { money_active: boolean } | null)?.money_active;
}

/** Milestones, activities and resources for one goal, plus the money decision. */
export async function loadGoalPage(goal: GoalKey): Promise<GoalPageData> {
  const today = todayYMD();
  const sb = createClient();
  const [ms, acts, res, money] = await Promise.all([
    sb.from("milestones").select("id,goal_id,title,horizon,due_day,done").eq("goal_id", goal),
    sb
      .from("activities")
      .select("id,day,category,goal_id,title,minutes,checklist")
      .eq("goal_id", goal)
      .order("day", { ascending: false })
      .order("created_at", { ascending: false }),
    sb.from("resources").select("id,goal_id,title,url").eq("goal_id", goal).order("created_at"),
    loadMoneyActive(),
  ]);
  fail(ms.error);
  fail(acts.error);
  fail(res.error);
  return {
    today,
    milestones: (ms.data ?? []) as GoalMilestone[],
    activities: (acts.data ?? []) as GoalActivity[],
    resources: (res.data ?? []) as GoalResource[],
    moneyActive: money,
  };
}

/** Self-care habits, today’s ticks, the latest workouts and the clothing orders. */
export async function loadGlowData(): Promise<GlowData> {
  const today = todayYMD();
  const sb = createClient();
  const habitRes = await sb.from("habits").select("id,title,grp,sort_order").order("sort_order");
  fail(habitRes.error);
  let rows = (habitRes.data ?? []) as GlowHabit[];
  if (!rows.length) {
    // First visit: the default habits are written once, the same as the Home page does.
    const seed = DEFAULT_HABITS.map((h, i) => ({ id: h.id, title: h.title, grp: h.grp, custom: false, sort_order: i + 1 }));
    const { error } = await sb.from("habits").insert(seed);
    if (error && error.code !== "23505") throw new Error(error.message);
    rows = seed.map((h) => ({ id: h.id, title: h.title, grp: h.grp, sort_order: h.sort_order }));
  }
  const [checks, workouts, orders] = await Promise.all([
    sb.from("habit_checks").select("habit_id").eq("day", today),
    sb.from("workouts").select("id,day,exercise,sets,reps,minutes").order("day", { ascending: false }).order("created_at", { ascending: false }).limit(12),
    sb.from("clothing_orders").select("id,item,store,order_day,status").order("created_at", { ascending: false }),
  ]);
  fail(checks.error);
  fail(workouts.error);
  fail(orders.error);
  return {
    today,
    habits: rows.filter((h) => h.grp === "glow"),
    checkedIds: ((checks.data ?? []) as { habit_id: string }[]).map((c) => c.habit_id),
    workouts: (workouts.data ?? []) as Workout[],
    orders: (orders.data ?? []) as ClothingOrder[],
  };
}

export async function loadCourses(): Promise<Course[]> {
  const { data, error } = await createClient()
    .from("courses")
    .select("id,name,platform,lessons_total,lessons_done,status,started_on,certificate")
    .order("created_at");
  fail(error);
  return (data ?? []) as Course[];
}

/** For the goal list: activities in the last 30 days per goal, milestones, and the money decision. */
export async function loadGoalTiles() {
  const today = todayYMD();
  const sb = createClient();
  const [acts, ms, money] = await Promise.all([
    sb.from("activities").select("goal_id").gte("day", addDays(today, -30)).not("goal_id", "is", null),
    sb.from("milestones").select("goal_id,done"),
    loadMoneyActive(),
  ]);
  fail(acts.error);
  fail(ms.error);
  const monthCounts: Record<string, number> = {};
  for (const a of (acts.data ?? []) as { goal_id: string }[]) monthCounts[a.goal_id] = (monthCounts[a.goal_id] ?? 0) + 1;
  return { monthCounts, milestones: (ms.data ?? []) as { goal_id: string; done: boolean }[], moneyActive: money };
}

/** AI session log, newest first. */
export type AiSession = {
  id: string; day: string; explored: string; learned: string; configured: string; built: string; problems: string; next_plan: string;
};
export async function loadAiSessions(): Promise<AiSession[]> {
  const { data, error } = await createClient()
    .from("ai_sessions")
    .select("id,day,explored,learned,configured,built,problems,next_plan")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []) as AiSession[];
}

/** Tech projects for the goal page: titles and stages only. The Tech Lab loads the logs. */
export type TechSummary = { id: string; title: string; status: string };
export async function loadTechSummary(): Promise<TechSummary[]> {
  const { data, error } = await createClient().from("projects").select("id,title,status").order("created_at").limit(6);
  fail(error);
  return (data ?? []) as TechSummary[];
}

/** Saved content (videos, documentaries, articles) for the reading goal: only the status is needed for the counts. */
export async function loadReadingSummary(): Promise<{ id: string; status: string }[]> {
  const { data, error } = await createClient().from("library_items").select("id,status").eq("kind", "content");
  fail(error);
  return (data ?? []) as { id: string; status: string }[];
}
