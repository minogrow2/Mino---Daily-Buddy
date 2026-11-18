"use client";

import { useMemo, useState } from "react";
import { dailyStats, equitySeries, monthlyTotals, sessionStats, summarize, type TradeRow } from "@/lib/trading/metrics";
import { money, numText, pctText } from "@/lib/trading/columns";
import { fmtDay } from "@/lib/dates";
import { Ring } from "./Ring";
import { DistributionDonut, EquityChart, MonthlyChart, SessionChart } from "./Charts";
import { MonthCalendar } from "./MonthCalendar";

export type AnalyticsTrade = TradeRow & { market?: string; direction?: string; explanation?: string };

export function AnalyticsView({
  trades,
  startingBalance,
  currency,
  today,
  profitTarget,
}: {
  trades: AnalyticsTrade[];
  startingBalance: number;
  currency: string;
  /** Today's trading day (YYYY-MM-DD), passed in by the client once data has loaded. */
  today: string;
  profitTarget: number | null;
}) {
  const [mode, setMode] = useState<"equity" | "cumulative">("equity");
  const [day, setDay] = useState<string | null>(null);

  const s = useMemo(() => summarize(trades, startingBalance), [trades, startingBalance]);
  const eq = useMemo(() => equitySeries(trades, startingBalance), [trades, startingBalance]);
  const daily = useMemo(() => dailyStats(trades), [trades]);
  const sessions = useMemo(() => sessionStats(trades), [trades]);
  const months = useMemo(() => monthlyTotals(trades), [trades]);
  const onDay = day ? trades.filter((t) => t.trade_date === day) : [];

  const pf = s.profitFactor === "infinite" ? "∞" : s.profitFactor === null ? "—" : numText(s.profitFactor);
  const progress = profitTarget && profitTarget > 0 ? Math.max(0, (s.netPL / profitTarget) * 100) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total trades" value={String(s.total)} sub={`${s.wins} wins · ${s.losses} losses · ${s.breakeven} breakeven`} />
        <Stat label="Net P/L" value={money(s.netPL, currency)} sub={`Avg ${money(s.avgPL, currency)} per trade`} tone={s.netPL > 0 ? "good" : s.netPL < 0 ? "bad" : undefined} />
        <Stat label="Profit factor" value={pf} sub="Gross profit ÷ gross loss" />
        <Stat label="Average R:R" value={numText(s.avgRR)} sub="Across trades that have an R:R" />
        <Stat label="Ending balance" value={money(s.endingBalance, currency)} sub={`Started at ${money(startingBalance, currency)}`} />
        <Stat label="Growth" value={pctText(s.growthPct)} sub="From the starting balance" />
        <Stat label="Gross profit" value={money(s.grossProfit, currency)} />
        <Stat label="Gross loss" value={money(-s.grossLoss, currency)} />
      </div>

      <div className="glass grid gap-6 p-5 sm:grid-cols-3">
        <Ring value={s.winRate} label="Win rate" sub="Breakeven excluded" color="#3f6b50" />
        <Ring value={s.growthPct === null ? null : Math.max(0, Math.min(100, s.growthPct))} label="Growth" sub="Balance change" color="#e2be5e" />
        <Ring value={progress === null ? null : Math.min(100, progress)} label="Target progress" sub={profitTarget ? `Goal ${money(profitTarget, currency)}` : "No target set"} color="#a9535f" />
      </div>

      <div className="glass p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl">Equity curve</h3>
          <div className="inline-flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label="Chart view">
            {(["equity", "cumulative"] as const).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${mode === m ? "bg-sage-deep text-white" : "text-muted"}`} style={mode === m ? { background: "var(--sage-deep)" } : undefined}>
                {m === "equity" ? "Balance" : "Cumulative P/L"}
              </button>
            ))}
          </div>
        </div>
        {eq.length ? <EquityChart points={eq} start={startingBalance} currency={currency} mode={mode} /> : <Empty text="Record a trade to see the equity curve." />}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-display mb-2 text-xl">Wins and losses</h3>
          <DistributionDonut wins={s.wins} losses={s.losses} breakeven={s.breakeven} />
        </div>
        <div className="glass p-5">
          <h3 className="font-display mb-2 text-xl">Sessions</h3>
          {sessions.length ? <SessionChart data={sessions.map((x) => ({ session: x.session, net: x.net }))} currency={currency} /> : <Empty text="No sessions recorded yet." />}
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="font-display mb-2 text-xl">Monthly P/L</h3>
        {months.length ? <MonthlyChart data={months.map((m) => ({ ym: m.ym, net: m.net }))} currency={currency} /> : <Empty text="Monthly totals appear once trades are recorded." />}
      </div>

      <div className="glass p-5">
        <h3 className="font-display mb-3 text-xl">Monthly calendar</h3>
        <p className="mb-3 text-xs text-muted">Green is a profitable day, red a losing day, and grey a day with no trades. Tap a day to see its trades.</p>
        <MonthCalendar daily={daily} today={today} initialYm={today.slice(0, 7)} selected={day} onSelect={(d) => setDay(d === day ? null : d)} currency={currency} />
        {day && (
          <div className="mt-4 rounded-xl border border-line p-3" style={{ background: "var(--sage-fill)" }}>
            <p className="mb-2 text-sm font-medium">{fmtDay(day, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</p>
            {onDay.length === 0 ? (
              <p className="text-sm text-muted">No trades on this day.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {onDay.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2">
                    <span className="tag">{t.result || "No result"}</span>
                    <span>{t.market || "No market"}</span>
                    <span className="text-muted">{t.direction || ""}</span>
                    <span className="ml-auto font-medium">{money(t.pl, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "#2f5a40" : tone === "bad" ? "#7d2f3a" : undefined;
  return (
    <div className="glass p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display mt-1 text-2xl leading-tight" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted">{text}</p>;
}
