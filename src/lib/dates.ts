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
