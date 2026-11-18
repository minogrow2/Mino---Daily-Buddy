export type Activity = { id: string; day: string; category: string; title: string; minutes: number; note: string };
export type Milestone = { id: string; title: string; horizon: string; due_day: string | null; done: boolean; created_at: string };
export type Resource = { id: string; title: string; url: string; created_at: string };
export type Note = { id: string; html: string; pinned: boolean; created_at: string; updated_at: string };
export type DocKind = "concept" | "backtest";
export type TradingDoc = {
  id: string;
  kind: DocKind;
  title: string;
  description: string;
  category: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type DayItem = { kind: "activity" | "document"; title: string; detail: string };

export const ACTIVITY_CATEGORIES = ["Learning", "Chart analysis", "Backtesting", "Documenting", "Strategy review", "Other"];
export const MILESTONE_HORIZONS = ["Short-term", "Weekly", "Monthly", "Long-term"];

export const newId = () => crypto.randomUUID();

/** Only http(s) links may be opened or saved as resources. */
export function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
