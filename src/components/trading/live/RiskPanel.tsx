"use client";

import type { Gauge, Level, RiskReport } from "@/lib/trading/metrics";
import { money, pctText } from "@/lib/trading/columns";
import type { Account } from "./useLiveData";

const LEVEL_TEXT: Record<Level, string> = { unset: "No limit set", safe: "Safe", warning: "Warning", critical: "Critical", breach: "Limit reached" };
const LEVEL_COLOR: Record<Level, string> = { unset: "var(--muted)", safe: "#3f6b50", warning: "#9a6a1e", critical: "#b0581f", breach: "#a9535f" };
const LEVEL_BAR: Record<Level, string> = { unset: "var(--sage-fill)", safe: "var(--sage)", warning: "#e2be5e", critical: "#c98a3e", breach: "#a9535f" };
const ORDER: Level[] = ["breach", "critical", "warning", "safe", "unset"];

const worst = (levels: Level[]) => ORDER.find((l) => levels.includes(l)) ?? "unset";

export function RiskPanel({
  account,
  report,
  onUnrealized,
  onStatus,
  onConfirmBreach,
  onEdit,
}: {
  account: Account;
  report: RiskReport;
  onUnrealized: (v: number) => void;
  onStatus: (s: Account["status"]) => void;
  onConfirmBreach: () => void;
  onEdit: () => void;
}) {
  const c = account.currency;
  const overall = worst([report.daily.level, report.overall.level, report.tradeLimit.level]);
  const breached = [report.daily.level, report.overall.level, report.tradeLimit.level].includes("breach");
  const banner =
    overall === "breach" ? "A limit has been reached. Stop trading for this account and review the rules."
    : overall === "critical" ? "You are close to a limit. Slow down and check your plan before the next trade."
    : overall === "warning" ? "You are past the first warning level. Trade carefully."
    : "Everything is within limits.";
  const bannerStyle = { background: `${LEVEL_BAR[overall]}33`, color: LEVEL_COLOR[overall] };
  const limitsHit = [
    report.daily.level === "breach" ? "daily loss" : null,
    report.overall.level === "breach" ? "overall loss" : null,
    report.tradeLimit.level === "breach" ? "trades per day" : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-5">
      <div role="status" className="rounded-2xl px-4 py-3 text-sm font-medium" style={bannerStyle}>{banner}</div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Balance" value={money(report.balance, c)} sub={`Realized P/L ${money(report.realizedPL, c)}`} />
        <Stat label="Equity" value={money(report.equity, c)} sub={account.include_floating ? "Includes open P/L" : "Open P/L not counted"} />
        <Stat label="Today’s P/L" value={money(report.todayPL, c)} sub={`${report.todayTrades} trade${report.todayTrades === 1 ? "" : "s"} today`} />
        <Stat label="Growth" value={pctText(report.growthPct)} sub="From the starting balance" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <GaugeBar title="Daily loss" g={report.daily} currency={c} />
        <GaugeBar title="Overall loss" g={report.overall} currency={c} />
        <GaugeBar title="Trades today" g={report.tradeLimit} currency={c} count />
      </div>

      {report.target && (
        <div className="glass p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <p className="font-medium">Profit target</p>
            <span className="tag">{report.target.reached ? "Reached" : `${Math.min(100, report.target.progressPct).toFixed(1)}%`}</span>
          </div>
          <div className="bar"><i style={{ width: `${Math.min(100, report.target.progressPct)}%` }} /></div>
          <p className="mt-2 text-xs text-muted">Goal {money(report.target.goal, c)} of profit.</p>
        </div>
      )}

      {breached && account.status !== "breached" && (
        <div className="glass space-y-2 border-2 p-4" style={{ borderColor: "#a9535f" }}>
          <p className="font-display text-lg">Breach detected</p>
          <p className="text-sm text-muted">The following limit{limitsHit.includes(",") ? "s were" : " was"} reached: {limitsHit}. Confirm it to record the breach in this account’s history.</p>
          <button className="btn btn-danger" onClick={onConfirmBreach}>Confirm breach</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass p-4">
          <label className="label" htmlFor="floating">Open (floating) P/L</label>
          <input id="floating" key={account.unrealized_pl} type="number" step="any" className="input" defaultValue={account.unrealized_pl}
            onBlur={(e) => { const n = Number(e.target.value || 0); if (Number.isFinite(n) && n !== account.unrealized_pl) onUnrealized(n); }} />
          <p className="mt-1 text-xs text-muted">Type the current floating P/L from your platform. Counted only if the account includes it.</p>
        </div>
        <div className="glass space-y-3 p-4">
          <p className="text-sm font-medium">Account status: <span className="tag ml-1">{account.status}</span></p>
          <div className="flex flex-wrap gap-2">
            {account.status !== "active" && <button className="btn btn-sm" onClick={() => onStatus("active")}>Mark active</button>}
            {account.status !== "passed" && <button className="btn btn-sm" onClick={() => onStatus("passed")}>Mark passed</button>}
            {account.status !== "breached" && <button className="btn btn-sm" onClick={() => onStatus("breached")}>Mark breached</button>}
            {account.status !== "archived" && <button className="btn btn-sm" onClick={() => onStatus("archived")}>Archive</button>}
            <button className="btn btn-sm" onClick={onEdit}>Edit rules</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GaugeBar({ title, g, currency, count }: { title: string; g: Gauge; currency: string; count?: boolean }) {
  const pct = Math.min(100, g.pctUsed ?? 0);
  const fmt = (n: number) => (count ? String(n) : money(n, currency));
  return (
    <div className="glass space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <span className="tag" style={{ color: LEVEL_COLOR[g.level] }}>{LEVEL_TEXT[g.level]}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--sage-fill)" }} role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: LEVEL_BAR[g.level] }} />
      </div>
      <p className="text-xs text-muted">
        {g.limit === null ? "Set a limit in the account rules to track this." : `${fmt(g.used)} used of ${fmt(g.limit)} · ${fmt(g.remaining ?? 0)} left`}
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display mt-1 text-2xl leading-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
