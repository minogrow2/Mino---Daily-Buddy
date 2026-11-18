"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRows } from "../useRows";
import { useLiveSettings, type Account } from "./useLiveData";
import { countedPL, positionSize, riskReport, riskReward, tradingDay, type TradeRow } from "@/lib/trading/metrics";
import { money, numText } from "@/lib/trading/columns";
import { ErrorNote } from "@/components/ui/Modal";

export function ToolsHome() {
  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
        <header className="glass p-5">
          <Link href="/goals/finance-trading/live" className="btn btn-sm">← Live Trading</Link>
          <h1 className="font-display mt-3 text-3xl">Calculators and checklist</h1>
          <p className="mt-1 text-sm text-muted">Work out a safe position size and risk-to-reward before you place a trade. Nothing here is saved except the checklist and the chosen account.</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-2">
          <PositionSize />
          <RiskReward />
        </div>
        <Checklist />
        <DailyTracker />
      </main>
    </div>
  );
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type="number" step="any" className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PositionSize() {
  const [balance, setBalance] = useState("");
  const [mode, setMode] = useState<"pct" | "amt">("pct");
  const [risk, setRisk] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [pip, setPip] = useState("0.0001");
  const [pipValue, setPipValue] = useState("10");
  const result = useMemo(() => {
    if ([num(balance), num(entry), num(stop), num(pip), num(pipValue)].some((x) => Number.isNaN(x))) return null;
    return positionSize({
      balance: num(balance),
      riskPct: mode === "pct" ? num(risk) : null,
      riskAmount: mode === "amt" ? num(risk) : null,
      entry: num(entry),
      stop: num(stop),
      pipSize: num(pip),
      pipValuePerLot: num(pipValue),
    });
  }, [balance, mode, risk, entry, stop, pip, pipValue]);

  return (
    <section className="glass glass-sage space-y-3 p-5">
      <h2 className="font-display text-xl">Position size</h2>
      <p className="text-xs text-muted">Enter the pip size and the money one pip is worth for one lot on your instrument. These differ between symbols.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="ps-bal" label="Account balance" value={balance} onChange={setBalance} />
        <div>
          <label className="label" htmlFor="ps-mode">Risk as</label>
          <select id="ps-mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as "pct" | "amt")}>
            <option value="pct">Percent of balance</option>
            <option value="amt">Fixed amount</option>
          </select>
        </div>
        <Field id="ps-risk" label={mode === "pct" ? "Risk (%)" : "Risk amount"} value={risk} onChange={setRisk} />
        <Field id="ps-entry" label="Entry price" value={entry} onChange={setEntry} />
        <Field id="ps-stop" label="Stop loss price" value={stop} onChange={setStop} />
        <Field id="ps-pip" label="Pip size" value={pip} onChange={setPip} />
        <Field id="ps-pv" label="Money per pip per lot" value={pipValue} onChange={setPipValue} />
      </div>
      <div role="status" className="rounded-xl p-3 text-sm" style={{ background: "var(--sage-fill)" }}>
        {result === null ? "Fill in the fields to see the lot size." : result.ok ? (
          <>
            <p className="font-display text-2xl">{result.lots.toFixed(2)} lots</p>
            <p className="text-muted">Risking {money(result.riskMoney)} over {numText(result.stopPips, 1)} pips. Lots round down to 0.01.</p>
          </>
        ) : <p className="text-rose">{result.error}</p>}
      </div>
    </section>
  );
}

function RiskReward() {
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [dir, setDir] = useState("Buy");
  const result = useMemo(() => {
    if ([num(entry), num(stop), num(target)].some((x) => Number.isNaN(x))) return null;
    return riskReward(num(entry), num(stop), num(target), dir);
  }, [entry, stop, target, dir]);
  return (
    <section className="glass glass-sage space-y-3 p-5">
      <h2 className="font-display text-xl">Risk-to-reward</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="rr-dir">Direction</label>
          <select id="rr-dir" className="input" value={dir} onChange={(e) => setDir(e.target.value)}>
            <option>Buy</option>
            <option>Sell</option>
          </select>
        </div>
        <Field id="rr-entry" label="Entry" value={entry} onChange={setEntry} />
        <Field id="rr-stop" label="Stop loss" value={stop} onChange={setStop} />
        <Field id="rr-target" label="Take profit" value={target} onChange={setTarget} />
      </div>
      <div role="status" className="rounded-xl p-3 text-sm" style={{ background: "var(--sage-fill)" }}>
        {result === null ? "Fill in the prices to see the ratio." : !result.ok ? <p className="text-rose">{result.error}</p> : (
          <>
            <p className="font-display text-2xl">1 : {result.rr.toFixed(2)}</p>
            {!result.sideOk && <p className="text-rose">For a {dir.toLowerCase()}, the stop should be on the {dir === "Buy" ? "lower" : "upper"} side of entry and the target on the {dir === "Buy" ? "upper" : "lower"} side.</p>}
          </>
        )}
      </div>
    </section>
  );
}

function Checklist() {
  const { settings, error, reload, setError } = useLiveSettings();
  const [draft, setDraft] = useState("");
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const items = settings?.checklist ?? [];

  async function save(next: string[]) {
    const { error } = await createClient().from("live_settings").upsert({ checklist: next }, { onConflict: "user_id" });
    if (error) return setError(error.message);
    setError(null);
    reload();
  }

  return (
    <section className="glass glass-sage space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">Pre-trade checklist</h2>
        <button className="btn btn-sm" onClick={() => setTicked(new Set())} disabled={ticked.size === 0}>Clear ticks</button>
      </div>
      <p className="text-xs text-muted">Ticks reset when you leave this page. The list itself is saved.</p>
      <ErrorNote error={error} />
      {settings === null ? <p className="text-sm text-muted">Loading…</p> : items.length === 0 ? (
        <p className="text-sm text-muted">No items yet. Add the checks you run before every trade.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={`${i}-${it}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: "var(--sage-fill)" }}>
              <input type="checkbox" className="accent-[var(--sage-deep)]" aria-label={`Done: ${it}`} checked={ticked.has(i)} onChange={() => setTicked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
              <span className={`flex-1 text-sm ${ticked.has(i) ? "line-through opacity-60" : ""}`}>{it}</span>
              <button className="btn btn-sm btn-danger" aria-label={`Remove ${it}`} onClick={() => save(items.filter((_, j) => j !== i))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (!t) return; save([...items, t.slice(0, 200)]); setDraft(""); }}>
        <input className="input" placeholder="e.g. Risk is within the daily limit" aria-label="New checklist item" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn-sage" disabled={!draft.trim()}>Add</button>
      </form>
    </section>
  );
}

function DailyTracker() {
  const accounts = useRows<Account>("prop_accounts", null, [{ column: "created_at" }]);
  const [picked, setPicked] = useState("");
  const list = (accounts.rows ?? []).filter((a) => a.status !== "archived");
  const acc = list.find((a) => a.id === picked) ?? list[0] ?? null;
  const trades = useRows<TradeRow & { id: string; account_id: string }>("live_trades", { field: "account_id", value: acc?.id ?? "" }, [{ column: "trade_date" }]);

  const report = (() => {
    if (!acc || !trades.rows) return null;
    const today = tradingDay(new Date(), acc.reset_timezone, acc.reset_time);
    const withFees = trades.rows.filter((t) => t.account_id === acc.id).map((t) => ({ ...t, pl: countedPL(t, acc.include_fees) }));
    return riskReport(withFees, {
      startingBalance: acc.starting_balance, accountSize: acc.account_size,
      dailyLossAmount: acc.max_daily_loss, dailyLossPct: acc.max_daily_loss_pct,
      overallLossAmount: acc.max_overall_loss, overallLossPct: acc.max_overall_loss_pct,
      drawdownType: acc.drawdown_type, includeFloating: acc.include_floating, includeFees: acc.include_fees,
      unrealized: acc.unrealized_pl, warnLow: acc.warn_low, warnHigh: acc.warn_high, today,
      maxTradesPerDay: acc.max_trades_per_day, profitTarget: acc.profit_target, dailyBasis: acc.daily_loss_basis,
    }, acc.include_fees);
  })();

  return (
    <section className="glass glass-sage space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Daily loss tracker</h2>
        {list.length > 0 && (
          <select className="input w-auto" aria-label="Account" value={acc?.id ?? ""} onChange={(e) => setPicked(e.target.value)}>
            {list.map((a) => <option key={a.id} value={a.id}>{a.firm_name}{a.account_label ? ` · ${a.account_label}` : ""}</option>)}
          </select>
        )}
      </div>
      <ErrorNote error={accounts.error ?? trades.error} />
      {accounts.rows === null ? <p className="text-sm text-muted">Loading…</p> : list.length === 0 ? (
        <p className="text-sm text-muted">Add a prop firm account to track its daily loss.</p>
      ) : !report || !acc ? <p className="text-sm text-muted">Loading trades…</p> : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl p-3" style={{ background: "var(--sage-fill)" }}>
            <p className="text-xs text-muted">Today’s P/L</p>
            <p className="font-display text-2xl">{money(report.todayPL, acc.currency)}</p>
            <p className="text-xs text-muted">{report.todayTrades} trade(s) today</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--sage-fill)" }}>
            <p className="text-xs text-muted">Daily loss used</p>
            <p className="font-display text-2xl">{report.daily.pctUsed === null ? "No limit" : `${report.daily.pctUsed.toFixed(0)}%`}</p>
            <p className="text-xs text-muted">{report.daily.remaining === null ? "Set a daily limit in the account rules" : `${money(report.daily.remaining, acc.currency)} left before the limit`}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--sage-fill)" }}>
            <p className="text-xs text-muted">Status</p>
            <p className="font-display text-2xl capitalize">{report.daily.level === "unset" ? "No limit" : report.daily.level}</p>
            <Link href={`/goals/finance-trading/live/accounts/${acc.id}`} className="text-xs underline">Open account</Link>
          </div>
        </div>
      )}
    </section>
  );
}
