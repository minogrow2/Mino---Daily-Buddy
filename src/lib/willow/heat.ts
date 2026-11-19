import type { YearRows } from "./types";

/** Activity count for any day: habit checks, logged activities and journal entries. Pass the rows from loadYear. */
export function scoreFn(rows: YearRows | null): (day: string) => number {
  const count = (days: string[] | undefined) => {
    const m: Record<string, number> = {};
    for (const d of days ?? []) m[d] = (m[d] ?? 0) + 1;
    return m;
  };
  const a = count(rows?.activityDays);
  const c = count(rows?.checkDays);
  const j = count(rows?.journalDays);
  return (d) => (a[d] ?? 0) + (c[d] ?? 0) + (j[d] ?? 0);
}
