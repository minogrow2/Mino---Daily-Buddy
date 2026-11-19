// Reads and pure rules for the Savings page. Deposits and withdrawals are separate records; nothing carries over.
import { createClient } from "@/lib/supabase/client";
import { addDays, shiftMonth } from "@/lib/dates";
import { pct, weekStart } from "./logic";

export type SavingsKind = "deposit" | "withdrawal";
export type SavingsEntry = { id: string; day: string; kind: SavingsKind; amount: number; note: string };

/** The weekly target until one is saved in user_settings.extra.savingsTarget. */
export const DEFAULT_SAVINGS_TARGET = 1000;

/** Peso amount with a minus sign for negatives, e.g. ₱1,250. */
export const php = (n: number) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? "−" : "") + "₱" + Math.abs(v).toLocaleString("en-PH");
};

/** Every savings record, newest day first. Row-level security limits this to the signed-in user. */
export async function loadSavings(): Promise<SavingsEntry[]> {
  const { data, error } = await createClient()
    .from("savings_entries")
    .select("id,day,kind,amount,note")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SavingsEntry[];
}

/** The weekly target from user_settings.extra. Falls back to the default when none is saved. */
export async function loadSavingsTarget(): Promise<number> {
  const { data, error } = await createClient().from("user_settings").select("extra").maybeSingle();
  if (error) throw new Error(error.message);
  const extra = (data?.extra ?? {}) as { savingsTarget?: unknown };
  const v = extra.savingsTarget;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : DEFAULT_SAVINGS_TARGET;
}

const net = (e: SavingsEntry) => (e.kind === "deposit" ? e.amount : -e.amount);
const sumKind = (rows: SavingsEntry[], kind: SavingsKind) =>
  rows.filter((r) => r.kind === kind).reduce((t, r) => t + r.amount, 0);

/** Everything the Savings page shows, worked out from the records and the target. */
export function savingsSummary(entries: SavingsEntry[], today: string, target: number) {
  const weekSaved = (day: string) => {
    const start = weekStart(day);
    const end = addDays(start, 6);
    return entries.filter((e) => e.day >= start && e.day <= end).reduce((t, e) => t + net(e), 0);
  };

  const saved = weekSaved(today);
  const progress = target ? Math.min(100, Math.max(0, pct(Math.max(0, saved), target))) : 0;

  const weeks = Array.from({ length: 8 }, (_, k) => {
    const ws = addDays(weekStart(today), -7 * k);
    const s = weekSaved(ws);
    return { ws, saved: s, progress: target ? Math.min(100, Math.max(0, pct(Math.max(0, s), target))) : 0 };
  });

  const months = Array.from({ length: 6 }, (_, k) => {
    const prefix = shiftMonth(today.slice(0, 7), -k);
    const rows = entries.filter((e) => e.day.startsWith(prefix));
    const dep = sumKind(rows, "deposit");
    const wd = sumKind(rows, "withdrawal");
    return { month: `${prefix}-01`, dep, wd, net: dep - wd };
  });

  return {
    saved,
    target,
    remaining: Math.max(0, target - saved),
    progress,
    balance: entries.reduce((t, e) => t + net(e), 0),
    weeks,
    months,
  };
}
