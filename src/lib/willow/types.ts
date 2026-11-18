// Row shapes for the Willow tables the Home page reads and writes (snake_case, as stored).

export type Habit = { id: string; title: string; grp: string; custom: boolean; sort_order: number };
export type HabitCheck = { day: string; habit_id: string };
export type Task = { id: string; day: string; title: string; done: boolean; priority: boolean; sort_order: number };
export type EventItem = { id: string; day: string; title: string; time_of_day: string | null };
export type Milestone = { id: string; goal_id: string; title: string; due_day: string | null; done: boolean };
export type Activity = {
  id: string; day: string; category: string; goal_id: string | null; title: string;
  minutes: number; offline: boolean; note: string; checklist: boolean; me_key: string;
};
export type DayMood = { day: string; mood: string | null; note: string; html: string };
export type MoodPhoto = { day: string; media_id: string; position: number };
export type JournalEntry = { id: string; day: string; type: string; title: string; body: string; html: string | null; tags: string[]; favorite: boolean };
export type ChatMsg = { id: string; role: "me" | "mino" | "note"; body: string; created_at: string };

/** Everything the Home page shows for one day and its week and month. */
export type HomeData = {
  today: string;
  habits: Habit[];
  checks: HabitCheck[];
  tasks: Task[];
  events: EventItem[];
  milestones: Milestone[];
  activities: Activity[];
  moods: DayMood[];
  moodPhotos: MoodPhoto[];
  lastOffline: string | null;
  chat: ChatMsg[];
  name: string;
  chatJournal: boolean;
};

/** Day-only rows for one year, used by the heatmap. */
export type YearRows = { activityDays: string[]; checkDays: string[]; journalDays: string[] };
