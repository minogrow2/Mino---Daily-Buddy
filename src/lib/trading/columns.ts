// Column definitions for the flexible trade tables (backtesting and live trading).
// Built-in columns map to real database fields. Custom columns live in the row's `extra` JSON.

export type ColumnType = "text" | "long" | "number" | "date" | "select" | "image" | "computed";

export type ColumnDef = {
  id: string;
  label: string;
  type: ColumnType;
  /** A database field ("market"), "extra.<id>" for custom columns, or a computed name ("no", "created", "pct"). */
  key: string;
  options?: string[];
  width: number;
  visible: boolean;
  builtin: boolean;
};

export const SESSIONS = ["Asian", "London", "New York", "Sydney", "Custom"];
export const DIRECTIONS = ["Buy", "Sell"];
export const RESULTS = ["Win", "Loss", "Breakeven"];
export const EMOTIONS = ["Confident", "Neutral", "Hesitant", "Fearful", "Greedy", "Frustrated", "FOMO", "Disciplined", "Other"];

const core = (id: string, label: string, type: ColumnType, key: string, width: number, extra: Partial<ColumnDef> = {}): ColumnDef => ({
  id, label, type, key, width, visible: true, builtin: true, ...extra,
});

export const BACKTEST_COLUMNS: ColumnDef[] = [
  core("no", "No.", "computed", "no", 64),
  core("created", "Current Date", "computed", "created", 130),
  core("trade_date", "Date Backtested", "date", "trade_date", 150),
  core("market", "Market", "text", "market", 120),
  core("session", "Session", "select", "session", 120, { options: SESSIONS }),
  core("direction", "Direction", "select", "direction", 100, { options: DIRECTIONS }),
  core("lot_size", "Lot Size", "number", "lot_size", 100),
  core("rr", "R:R", "number", "rr", 90),
  core("result", "Result", "select", "result", 120, { options: RESULTS }),
  core("pl", "P/L", "number", "pl", 120),
  core("pct", "%", "computed", "pct", 90),
  core("screenshot", "Screenshot", "image", "screenshot_id", 130),
  core("emotion", "Emotion", "select", "emotion", 170, { options: EMOTIONS }),
  core("explanation", "Explanation", "long", "explanation", 340),
];

export const LIVE_COLUMNS: ColumnDef[] = [
  core("no", "No.", "computed", "no", 64),
  core("created", "Current Date", "computed", "created", 130),
  core("trade_date", "Trade Date", "date", "trade_date", 150),
  core("market", "Market", "text", "market", 120),
  core("session", "Session", "select", "session", 120, { options: SESSIONS }),
  core("direction", "Direction", "select", "direction", 100, { options: DIRECTIONS }),
  core("lot_size", "Lot Size", "number", "lot_size", 100),
  core("stop_loss", "Stop Loss", "number", "stop_loss", 110),
  core("take_profit", "Take Profit", "number", "take_profit", 110),
  core("rr", "R:R", "number", "rr", 90),
  core("result", "Result", "select", "result", 120, { options: RESULTS }),
  core("pl", "P/L", "number", "pl", 120),
  core("fee", "Fees", "number", "fee", 100),
  core("pct", "% Change", "computed", "pct", 110),
  core("screenshot", "Screenshot", "image", "screenshot_id", 130),
  core("emotion", "Emotion", "select", "emotion", 170, { options: EMOTIONS }),
  core("explanation", "Explanation", "long", "explanation", 340),
];

export function defaultColumns(scope: "backtest" | "live"): ColumnDef[] {
  return (scope === "live" ? LIVE_COLUMNS : BACKTEST_COLUMNS).map((c) => ({ ...c, options: c.options ? [...c.options] : undefined }));
}

/** Saved column layout, with any new built-in columns added at the end. Empty means use the defaults. */
export function resolveColumns(saved: unknown, scope: "backtest" | "live"): ColumnDef[] {
  const defaults = defaultColumns(scope);
  if (!Array.isArray(saved) || saved.length === 0) return defaults;
  // Built-in columns keep the user's label, order, width and visibility, but always take their type, key and options from the defaults.
  const byId = new Map(defaults.map((d) => [d.id, d]));
  const cols = (saved as ColumnDef[]).map((c) => {
    const d = c.builtin ? byId.get(c.id) : undefined;
    return d ? { ...c, type: d.type, key: d.key, options: d.options ? [...d.options] : undefined } : c;
  });
  const have = new Set(cols.map((c) => c.id));
  return [...cols, ...defaults.filter((d) => d.builtin && !have.has(d.id))];
}

export const customId = (c: ColumnDef) => (c.key.startsWith("extra.") ? c.key.slice(6) : null);
export const isComputed = (c: ColumnDef) => c.type === "computed";

export function readValue(row: Record<string, unknown>, c: ColumnDef): unknown {
  const x = customId(c);
  if (x) return (row.extra as Record<string, unknown> | undefined)?.[x] ?? "";
  if (isComputed(c)) return null;
  return row[c.key] ?? (c.type === "text" || c.type === "long" || c.type === "select" ? "" : null);
}

/** Turns what the user typed into the value to store. Profit and fees are never null. */
export function coerce(c: ColumnDef, raw: unknown): unknown {
  if (c.key === "pl" || c.key === "fee") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (c.type === "number") {
    if (raw === "" || raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (c.type === "date" || c.type === "image") return raw ? String(raw) : null;
  return raw ?? "";
}

/** The fields to write for one cell, including the `extra` JSON for custom columns. */
export function patchFor(row: Record<string, unknown>, c: ColumnDef, raw: unknown): Record<string, unknown> {
  const value = coerce(c, raw);
  const x = customId(c);
  if (x) return { extra: { ...((row.extra as Record<string, unknown>) ?? {}), [x]: value } };
  return { [c.key]: value };
}

export const money = (v: number | null | undefined, currency = "PHP") => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
};
export const pctText = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`);
export const numText = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(d));

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
