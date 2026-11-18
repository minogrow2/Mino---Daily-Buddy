/** All "days" in Willow are calendar dates (YYYY-MM-DD) in Asia/Manila, never the browser's zone. */
export const TZ = "Asia/Manila";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** The Manila calendar day of an instant (a Date or an ISO timestamp). */
export function ymd(d: Date | string): string {
  return dayFmt.format(typeof d === "string" ? new Date(d) : d);
}
export const todayYMD = () => ymd(new Date());

/** Add whole days to a YYYY-MM-DD string (calendar arithmetic, no timezone drift). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD string. */
export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function fmtStamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** Days in the month of a YYYY-MM or YYYY-MM-DD string. */
export function daysInMonth(day: string): number {
  const [y, m] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
/** The first day of a day’s month, as YYYY-MM-01. */
export const monthStartOf = (day: string) => `${day.slice(0, 7)}-01`;
/** Move a YYYY-MM month by whole months. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}
/** "November 2026" for a day in that month. */
export function fmtMonth(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}
