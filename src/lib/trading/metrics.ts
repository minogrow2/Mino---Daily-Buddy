// Pure trading calculations: analytics, daily/monthly P&L and prop-firm risk.
// No React and no I/O, so every rule here can be unit-tested directly.

export type TradeRow = {
  id: string;
  trade_date: string; // YYYY-MM-DD
  position: number;
  created_at: string;
  pl: number;
  fee?: number;
  rr: number | null;
  result: string; // "", "Win", "Loss", "Breakeven"
  session: string;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const pad = (n: number) => String(n).padStart(2, "0");

export function chronological<T extends TradeRow>(trades: T[]): T[] {
  return [...trades].sort(
    (a, b) => a.trade_date.localeCompare(b.trade_date) || a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
}

/* ---------- Performance summary ---------- */

export type Summary = {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  /** Wins / (wins + losses) × 100. Breakeven trades are excluded. Null when there are no wins or losses. */
  winRate: number | null;
  netPL: number;
  avgPL: number | null;
  avgRR: number | null;
  grossProfit: number;
  grossLoss: number; // positive number
  /** Gross profit ÷ absolute gross loss. "infinite" when there are wins but no losses. Null when neither exists. */
  profitFactor: number | "infinite" | null;
  startingBalance: number;
  endingBalance: number;
  /** Account growth from the starting balance, using the real balance (not summed percentages). */
  growthPct: number | null;
};

export function summarize(trades: TradeRow[], startingBalance: number): Summary {
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const breakeven = trades.filter((t) => t.result === "Breakeven").length;
  const pls = trades.map((t) => num(t.pl));
  const netPL = sum(pls);
  const grossProfit = sum(pls.filter((p) => p > 0));
  const grossLoss = -sum(pls.filter((p) => p < 0));
  const rrs = trades.map((t) => t.rr).filter((r): r is number => typeof r === "number");
  const endingBalance = startingBalance + netPL;
  return {
    total: trades.length,
    wins,
    losses,
    breakeven,
    winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
    netPL,
    avgPL: trades.length ? netPL / trades.length : null,
    avgRR: rrs.length ? mean(rrs) : null,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? "infinite" : null,
    startingBalance,
    endingBalance,
    growthPct: startingBalance > 0 ? (netPL / startingBalance) * 100 : null,
  };
}

/* ---------- Equity curve ---------- */

export type EquityPoint = {
  trade_id: string;
  day: string;
  index: number;
  pl: number;
  equity: number;
  /** This trade's change relative to the balance just before it. Null if that balance is zero or less. */
  pctChange: number | null;
  cumPL: number;
};

/** Balance after each trade in date order. Each % is the trade's P&L over the balance before it (compounded). */
export function equitySeries(trades: TradeRow[], startingBalance: number): EquityPoint[] {
  let eq = startingBalance;
  let cum = 0;
  return chronological(trades).map((t, i) => {
    const pl = num(t.pl);
    const before = eq;
    eq += pl;
    cum += pl;
    return {
      trade_id: t.id,
      day: t.trade_date,
      index: i + 1,
      pl,
      equity: eq,
      pctChange: before > 0 ? (pl / before) * 100 : null,
      cumPL: cum,
    };
  });
}

/* ---------- Daily and monthly ---------- */

export type DayStat = { day: string; net: number; count: number; wins: number; losses: number; breakeven: number };
export type DayTone = "profit" | "loss" | "flat" | "none";

export function dailyStats(trades: TradeRow[]): Record<string, DayStat> {
  const out: Record<string, DayStat> = {};
  for (const t of trades) {
    const s = (out[t.trade_date] ??= { day: t.trade_date, net: 0, count: 0, wins: 0, losses: 0, breakeven: 0 });
    s.net += num(t.pl);
    s.count += 1;
    if (t.result === "Win") s.wins += 1;
    else if (t.result === "Loss") s.losses += 1;
    else if (t.result === "Breakeven") s.breakeven += 1;
  }
  return out;
}

/** Colour of a calendar day. Based on the day's total, never on individual trades. */
export function dayTone(stat: DayStat | undefined): DayTone {
  if (!stat || stat.count === 0) return "none";
  if (stat.net > 0) return "profit";
  if (stat.net < 0) return "loss";
  return "flat";
}

export type MonthStat = {
  ym: string;
  net: number;
  trades: number;
  profitDays: number;
  lossDays: number;
  noTradeDays: number;
};

/** Stats for one month. "No-trade days" counts days up to `today` only, so future days are not counted. */
export function monthStat(daily: Record<string, DayStat>, ym: string, today: string): MonthStat {
  const [y, m] = ym.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let net = 0, trades = 0, profitDays = 0, lossDays = 0, noTradeDays = 0;
  for (let d = 1; d <= dim; d++) {
    const day = `${ym}-${pad(d)}`;
    if (day > today) break;
    const s = daily[day];
    if (!s || s.count === 0) {
      noTradeDays += 1;
      continue;
    }
    net += s.net;
    trades += s.count;
    if (s.net > 0) profitDays += 1;
    else if (s.net < 0) lossDays += 1;
  }
  return { ym, net, trades, profitDays, lossDays, noTradeDays };
}

export function monthlyTotals(trades: TradeRow[]): { ym: string; net: number; trades: number }[] {
  const acc: Record<string, { net: number; trades: number }> = {};
  for (const t of trades) {
    const ym = t.trade_date.slice(0, 7);
    const a = (acc[ym] ??= { net: 0, trades: 0 });
    a.net += num(t.pl);
    a.trades += 1;
  }
  return Object.keys(acc).sort().map((ym) => ({ ym, ...acc[ym] }));
}

export function sessionStats(trades: TradeRow[]) {
  const acc: Record<string, { session: string; count: number; net: number; wins: number; losses: number }> = {};
  for (const t of trades) {
    const key = t.session || "Unspecified";
    const a = (acc[key] ??= { session: key, count: 0, net: 0, wins: 0, losses: 0 });
    a.count += 1;
    a.net += num(t.pl);
    if (t.result === "Win") a.wins += 1;
    if (t.result === "Loss") a.losses += 1;
  }
  return Object.values(acc)
    .map((a) => ({ ...a, winRate: a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) * 100 : null }))
    .sort((a, b) => b.count - a.count);
}

/* ---------- Trading day (account reset) ---------- */

/**
 * The trading day an instant belongs to, using the account's own timezone and reset time.
 * A trading day is labelled with the date it starts. With a 17:00 New York reset, the day that
 * starts at 17:00 on 18 Nov is "18 Nov", and 16:30 on 18 Nov still belongs to "17 Nov".
 * Never uses the browser's local midnight.
 */
export function tradingDay(now: Date, timeZone: string, resetTime: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const [rh, rm] = resetTime.split(":").map(Number);
  const minutes = Number(get("hour")) * 60 + Number(get("minute")) - (rh * 60 + rm);
  let day = `${get("year")}-${get("month")}-${get("day")}`;
  if (minutes < 0) {
    const [y, m, d] = day.split("-").map(Number);
    day = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  }
  return day;
}

/* ---------- Prop firm risk ---------- */

export type Level = "unset" | "safe" | "warning" | "critical" | "breach";

export type Gauge = {
  limit: number | null;
  used: number;
  remaining: number | null;
  /** Percent of the limit used. Null when no limit is set. */
  pctUsed: number | null;
  level: Level;
};

export type RiskSettings = {
  startingBalance: number;
  accountSize: number;
  dailyLossAmount: number | null;
  dailyLossPct: number | null;
  overallLossAmount: number | null;
  overallLossPct: number | null;
  drawdownType: "static" | "trailing";
  includeFloating: boolean;
  includeFees: boolean;
  unrealized: number;
  warnLow: number; // percent, e.g. 70
  warnHigh: number; // percent, e.g. 85
  today: string; // trading day, YYYY-MM-DD
  maxTradesPerDay: number | null;
  profitTarget: number | null;
};

export type RiskReport = {
  balance: number;
  equity: number;
  realizedPL: number;
  floatingPL: number;
  growthPct: number;
  dailyStartBalance: number;
  todayPL: number;
  todayTrades: number;
  daily: Gauge;
  overall: Gauge;
  tradeLimit: Gauge;
  target: { goal: number; progressPct: number; reached: boolean } | null;
};

export function gauge(limit: number | null, used: number, warnLow: number, warnHigh: number): Gauge {
  if (limit === null || limit <= 0) return { limit: null, used, remaining: null, pctUsed: null, level: "unset" };
  const pctUsed = (used / limit) * 100;
  const level: Level = used >= limit ? "breach" : pctUsed >= warnHigh ? "critical" : pctUsed >= warnLow ? "warning" : "safe";
  return { limit, used, remaining: Math.max(0, limit - used), pctUsed, level };
}

/** Realised P&L of one trade as the firm counts it (fees subtracted only if the account says so). */
export function countedPL(t: TradeRow, includeFees: boolean): number {
  return num(t.pl) - (includeFees ? num(t.fee) : 0);
}

export function riskReport(trades: TradeRow[], s: RiskSettings, includeFees: boolean): RiskReport {
  const ordered = chronological(trades);
  const realizedPL = sum(ordered.map((t) => countedPL(t, includeFees)));
  const balance = s.startingBalance + realizedPL;
  const floatingCounted = s.includeFloating ? s.unrealized : 0;
  const equity = balance + floatingCounted;

  const priorDays = ordered.filter((t) => t.trade_date < s.today);
  const dailyStartBalance = s.startingBalance + sum(priorDays.map((t) => countedPL(t, includeFees)));
  const todays = ordered.filter((t) => t.trade_date === s.today);
  const todayPL = sum(todays.map((t) => countedPL(t, includeFees))) + floatingCounted;

  // Daily loss: how far today's P&L is below zero, measured against the start-of-day balance.
  const dailyLimit = s.dailyLossAmount ?? (s.dailyLossPct !== null ? (s.dailyLossPct / 100) * s.accountSize : null);
  const daily = gauge(dailyLimit, Math.max(0, -todayPL), s.warnLow, s.warnHigh);

  // Overall loss: static = below the starting balance; trailing = below the highest balance reached.
  let peak = s.startingBalance;
  let running = s.startingBalance;
  for (const t of ordered) {
    running += countedPL(t, includeFees);
    peak = Math.max(peak, running);
  }
  peak = Math.max(peak, equity);
  const overallLimit = s.overallLossAmount ?? (s.overallLossPct !== null ? (s.overallLossPct / 100) * s.accountSize : null);
  const overallUsed = s.drawdownType === "trailing" ? Math.max(0, peak - equity) : Math.max(0, s.startingBalance - equity);
  const overall = gauge(overallLimit, overallUsed, s.warnLow, s.warnHigh);

  const tradeLimit = gauge(s.maxTradesPerDay, todays.length, s.warnLow, s.warnHigh);

  const target = s.profitTarget && s.profitTarget > 0
    ? {
        goal: s.profitTarget,
        progressPct: Math.max(0, ((equity - s.startingBalance) / s.profitTarget) * 100),
        reached: equity - s.startingBalance >= s.profitTarget,
      }
    : null;

  return {
    balance,
    equity,
    realizedPL,
    floatingPL: s.unrealized,
    growthPct: s.startingBalance > 0 ? ((equity - s.startingBalance) / s.startingBalance) * 100 : 0,
    dailyStartBalance,
    todayPL,
    todayTrades: todays.length,
    daily,
    overall,
    tradeLimit,
    target,
  };
}

/* ---------- Calculators ---------- */

export type SizeResult =
  | { ok: true; riskMoney: number; stopPips: number; lots: number }
  | { ok: false; error: string };

/**
 * Lot size = risk money ÷ (stop distance in pips × money per pip per lot).
 * The pip size and pip value come from the user, because they depend on the instrument.
 * Lots are rounded DOWN to 0.01 so the risk never exceeds the chosen amount.
 */
export function positionSize(input: {
  balance: number;
  riskPct?: number | null;
  riskAmount?: number | null;
  entry: number;
  stop: number;
  pipSize: number;
  pipValuePerLot: number;
}): SizeResult {
  const { balance, riskPct, riskAmount, entry, stop, pipSize, pipValuePerLot } = input;
  const riskMoney = riskAmount ?? (riskPct != null ? (balance * riskPct) / 100 : NaN);
  if (!(riskMoney > 0)) return { ok: false, error: "Enter a risk amount or percentage above zero." };
  if (!(pipSize > 0) || !(pipValuePerLot > 0)) return { ok: false, error: "Enter the pip size and the money per pip per lot for this instrument." };
  const stopPips = Math.abs(entry - stop) / pipSize;
  if (!(stopPips > 0)) return { ok: false, error: "The stop loss must be away from the entry price." };
  const lots = Math.floor((riskMoney / (stopPips * pipValuePerLot)) * 100) / 100;
  if (!(lots > 0)) return { ok: false, error: "Risk is too small for this stop distance. Widen the risk or tighten the stop." };
  return { ok: true, riskMoney, stopPips, lots };
}

export function riskReward(entry: number, stop: number, target: number, direction: string) {
  const risk = Math.abs(entry - stop);
  if (!(risk > 0)) return { ok: false as const, error: "Stop loss must be different from entry." };
  const sideOk =
    direction === "Buy" ? stop < entry && entry < target : direction === "Sell" ? target < entry && entry < stop : true;
  return { ok: true as const, rr: Math.abs(target - entry) / risk, sideOk };
}
