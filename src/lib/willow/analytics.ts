// Reads for the Analytics page. Every query is limited to the signed-in user by row-level security.
// Rows saved as examples (demo = true) are left out, so every figure comes from the person's own records.
import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";
import { weekStart } from "./logic";

type Failure = { message: string } | null;
type Page<T> = PromiseLike<{ data: T[] | null; error: Failure }>;

/** PostgREST returns at most 1000 rows a request, so each read continues until a short page ends it. */
const PAGE = 1000;
async function readAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export type HabitRow = { id: string; grp: string };
export type CheckRow = { day: string; habit_id: string };
export type TaskRow = { day: string; done: boolean };
export type ActivityRow = { day: string; category: string; minutes: number };
export type ScreenRow = { day: string; total_minutes: number };
export type MilestoneRow = { goal_id: string; done: boolean };
export type CourseRow = { status: string; lessons_done: number; lessons_total: number };
export type ProjectRow = { status: string };
export type SavingRow = { kind: string; amount: number };

/** The rows the Analytics page needs for one range, as plain arrays. */
export type AnalyticsRows = {
  habits: HabitRow[];
  checks: CheckRow[];
  tasks: TaskRow[];
  activities: ActivityRow[];
  screen: ScreenRow[];
  milestones: MilestoneRow[];
  courses: CourseRow[];
  projects: ProjectRow[];
  savings: SavingRow[];
  /** Whether any record exists at all, not only inside the range. Drives the empty state, as in the legacy app. */
  hasRecords: boolean;
};

/**
 * Everything the Analytics page charts for the last `range` days ending on `today`.
 * Tasks also cover the last four Monday-to-Sunday weeks; the milestones, courses, projects and savings are read in full.
 */
export async function loadAnalytics(today: string, range: number): Promise<AnalyticsRows> {
  const sb = createClient();
  const rangeStart = addDays(today, -(range - 1));
  const thisWeek = weekStart(today);
  // Four weeks: the first starts three weeks before this week, the last ends on this week's Sunday.
  const weeksFrom = addDays(thisWeek, -21);
  const weeksTo = addDays(thisWeek, 6);
  const tasksFrom = [rangeStart, weeksFrom].sort()[0];

  const [habits, checks, tasks, activities, screen, milestones, courses, projects, savings, anyActivity, anyTask, anyCheck] =
    await Promise.all([
      readAll<HabitRow>((a, b) => sb.from("habits").select("id,grp").order("id").range(a, b)),
      readAll<CheckRow>((a, b) =>
        sb.from("habit_checks").select("day,habit_id").gte("day", rangeStart).lte("day", today).order("day").order("habit_id").range(a, b),
      ),
      readAll<TaskRow>((a, b) =>
        sb.from("tasks").select("day,done").eq("demo", false).gte("day", tasksFrom).lte("day", weeksTo).order("day").order("id").range(a, b),
      ),
      readAll<ActivityRow>((a, b) =>
        sb.from("activities").select("day,category,minutes").eq("demo", false).gte("day", rangeStart).lte("day", today).order("day").order("id").range(a, b),
      ),
      readAll<ScreenRow>((a, b) =>
        sb.from("screen_days").select("day,total_minutes").eq("demo", false).gte("day", rangeStart).lte("day", today).order("day").range(a, b),
      ),
      readAll<MilestoneRow>((a, b) => sb.from("milestones").select("goal_id,done").eq("demo", false).order("id").range(a, b)),
      readAll<CourseRow>((a, b) => sb.from("courses").select("status,lessons_done,lessons_total").order("id").range(a, b)),
      readAll<ProjectRow>((a, b) => sb.from("projects").select("status").order("id").range(a, b)),
      readAll<SavingRow>((a, b) => sb.from("savings_entries").select("kind,amount").eq("demo", false).order("id").range(a, b)),
      sb.from("activities").select("id").eq("demo", false).limit(1),
      sb.from("tasks").select("id").eq("demo", false).limit(1),
      sb.from("habit_checks").select("day").limit(1),
    ]);

  for (const r of [anyActivity, anyTask, anyCheck]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    habits,
    checks,
    tasks,
    activities,
    screen,
    milestones,
    courses,
    projects,
    savings,
    hasRecords: [anyActivity, anyTask, anyCheck].some((r) => (r.data?.length ?? 0) > 0),
  };
}
