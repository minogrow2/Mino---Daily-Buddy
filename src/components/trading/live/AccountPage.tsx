"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayYMD, fmtStamp } from "@/lib/dates";
import { useRows } from "../useRows";
import { useAccount, type Account } from "./useLiveData";
import { RiskPanel } from "./RiskPanel";
import { AccountForm } from "./AccountForm";
import { FlexTable, type FlexRow } from "../trades/FlexTable";
import { AnalyticsView } from "../analytics/AnalyticsView";
import { countedPL, equitySeries, riskReport, tradingDay, type RiskSettings, type TradeRow } from "@/lib/trading/metrics";
import { resolveColumns, type ColumnDef } from "@/lib/trading/columns";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";

type LiveTrade = TradeRow & {
  account_id: string;
  screenshot_id: string | null;
  market: string;
  direction: string;
  lot_size: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  emotion: string;
  explanation: string;
  fee: number;
  extra: Record<string, unknown>;
};
type RiskEvent = { id: string; kind: "breach_confirmed" | "status_change" | "note"; trading_day: string | null; detail: string; created_at: string };
type Tab = "risk" | "trades" | "analytics" | "history";

const EVENT_LABEL: Record<RiskEvent["kind"], string> = { breach_confirmed: "Breach confirmed", status_change: "Status change", note: "Note" };

function settingsFor(a: Account, today: string): RiskSettings {
  return {
    startingBalance: a.starting_balance,
    accountSize: a.account_size,
    dailyLossAmount: a.max_daily_loss,
    dailyLossPct: a.max_daily_loss_pct,
    overallLossAmount: a.max_overall_loss,
    overallLossPct: a.max_overall_loss_pct,
    drawdownType: a.drawdown_type,
    includeFloating: a.include_floating,
    includeFees: a.include_fees,
    unrealized: a.unrealized_pl,
    warnLow: a.warn_low,
    warnHigh: a.warn_high,
    today,
    maxTradesPerDay: a.max_trades_per_day,
    profitTarget: a.profit_target,
  };
}

export function AccountPage({ id }: { id: string }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const { account, missing, error: accErr, reload: reloadAccount } = useAccount(id);
  const trades = useRows<LiveTrade>("live_trades", { field: "account_id", value: id }, [{ column: "trade_date" }, { column: "position" }]);
  const events = useRows<RiskEvent>("risk_events", { field: "account_id", value: id }, [{ column: "created_at", ascending: false }]);
  const [tab, setTab] = useState<Tab>("risk");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { ask, dialog } = useConfirm();

  const rows = useMemo(() => trades.rows ?? [], [trades.rows]);
  // "Today" is the account's own trading day, so it is computed only once the account has loaded.
  const today = account && trades.rows ? tradingDay(new Date(), account.reset_timezone, account.reset_time) : "";
  const report = account && today ? riskReport(rows, settingsFor(account, today), account.include_fees) : null;
  const columns = useMemo<ColumnDef[]>(() => (account ? resolveColumns(account.columns, "live") : []), [account]);
  const pctById = useMemo(() => {
    if (!account) return {};
    return Object.fromEntries(equitySeries(rows.map((t) => ({ ...t, pl: countedPL(t, account.include_fees) })), account.starting_balance).map((p) => [p.trade_id, p.pctChange]));
  }, [rows, account]);

  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };
  async function addRow() {
    fail((await sb.from("live_trades").insert({ account_id: id, trade_date: today || todayYMD(), position: rows.length })).error);
    await trades.reload();
  }
  async function patchRow(rowId: string, patch: Record<string, unknown>) {
    fail((await sb.from("live_trades").update(patch).eq("id", rowId)).error);
    await trades.reload();
  }
  async function deleteRows(ids: string[]) {
    fail((await sb.from("live_trades").delete().in("id", ids)).error);
    await trades.reload();
  }
  async function saveColumns(cols: ColumnDef[]) {
    fail((await sb.from("prop_accounts").update({ columns: cols }).eq("id", id)).error);
    await reloadAccount();
  }
  async function logEvent(kind: RiskEvent["kind"], detail: string) {
    fail((await sb.from("risk_events").insert({ account_id: id, kind, detail, trading_day: today || null })).error);
    await events.reload();
  }
  async function setStatus(next: Account["status"]) {
    if (!account || next === account.status) return;
    try {
      fail((await sb.from("prop_accounts").update({ status: next }).eq("id", id)).error);
      await logEvent("status_change", `Status changed from ${account.status} to ${next}.`);
      await reloadAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the status.");
    }
  }
  async function setUnrealized(v: number) {
    try {
      fail((await sb.from("prop_accounts").update({ unrealized_pl: v }).eq("id", id)).error);
      await reloadAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the open P/L.");
    }
  }
  async function confirmBreach() {
    if (!report || !account) return;
    const detail = `Daily loss ${report.daily.used.toFixed(2)} of ${report.daily.limit ?? "not set"}; overall loss ${report.overall.used.toFixed(2)} of ${report.overall.limit ?? "not set"}; ${report.todayTrades} trade(s) today.`;
    try {
      await logEvent("breach_confirmed", detail);
      fail((await sb.from("prop_accounts").update({ status: "breached" }).eq("id", id)).error);
      await reloadAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm the breach.");
    }
  }
  async function addNote() {
    const t = note.trim();
    if (!t) return;
    try {
      await logEvent("note", t);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note.");
    }
  }
  async function removeAccount() {
    if (!account) return;
    const msg = rows.length
      ? `Delete ${account.firm_name} and its ${rows.length} trade${rows.length === 1 ? "" : "s"} and history? This can’t be undone. Archive it instead to keep the records.`
      : `Delete ${account.firm_name} and its history? This can’t be undone.`;
    if (!(await ask(msg))) return;
    const { error: e } = await sb.from("prop_accounts").delete().eq("id", id);
    if (e) return setError(e.message);
    router.push("/goals/finance-trading/live");
  }

  if (missing)
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="mb-4">This account doesn’t exist or isn’t yours.</p>
        <Link className="btn" href="/goals/finance-trading/live">← Live Trading</Link>
      </div>
    );
  if (!account)
    return <div className="p-10 text-center text-sm text-muted">{accErr || trades.error ? <ErrorNote error={accErr ?? trades.error} /> : "Loading account…"}</div>;

  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
        <header className="glass flex flex-wrap items-center gap-3 p-5">
          <Link href="/goals/finance-trading/live" className="btn btn-sm">← Live Trading</Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-3xl">{account.firm_name}</h1>
            <p className="text-sm text-muted">{account.account_label || "No label"} · {account.currency} · size {account.account_size.toLocaleString()}</p>
          </div>
          <span className="tag">{account.status}</span>
        </header>
        <ErrorNote error={error ?? trades.error ?? events.error} />

        <div className="glass inline-flex flex-wrap p-1" role="tablist" aria-label="Account sections">
          {([["risk", "Risk"], ["trades", "Trades"], ["analytics", "Statistics"], ["history", "History"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? "text-white" : "text-muted hover:text-fg"}`} style={tab === k ? { background: "var(--sage-deep)" } : undefined}>
              {l}
            </button>
          ))}
        </div>

        {tab === "risk" && (report ? (
          <>            <RiskPanel account={account} report={report} onUnrealized={setUnrealized} onStatus={setStatus} onConfirmBreach={confirmBreach} onEdit={() => setEditing(true)} />
          </>
        ) : <p className="py-10 text-center text-sm text-muted">Loading risk…</p>)}

        {tab === "trades" && (trades.rows === null ? <p className="py-10 text-center text-sm text-muted">Loading trades…</p> : (
          <FlexTable
            scope="live"
            columns={columns}
            rows={rows as FlexRow[]}
            urls={trades.urls}
            pctById={pctById}
            currency={account.currency}
            csvName={`${account.firm_name} live trades`}
            onColumnsChange={saveColumns}
            onCreate={addRow}
            onPatch={patchRow}
            onDelete={deleteRows}
          />
        ))}

        {tab === "analytics" && trades.rows !== null && today && (
          <AnalyticsView
            trades={rows.map((t) => ({ ...t, pl: countedPL(t, account.include_fees) }))}
            startingBalance={account.starting_balance}
            currency={account.currency}
            today={today}
            profitTarget={account.profit_target}
          />
        )}

        {tab === "history" && (
          <div className="space-y-5">
            <div className="glass space-y-3 p-5">
              <label className="label" htmlFor="note">Add a note</label>
              <div className="flex flex-wrap gap-2">
                <input id="note" className="input flex-1" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="e.g. Called the firm about the rule change" />
                <button className="btn btn-sage" onClick={addNote} disabled={!note.trim()}>Save note</button>
              </div>
            </div>
            <div className="glass p-5">
              <h2 className="font-display mb-3 text-xl">History</h2>
              {events.rows === null ? <p className="text-sm text-muted">Loading…</p> : events.rows.length === 0 ? (
                <p className="text-sm text-muted">Nothing recorded yet. Status changes, breaches and notes appear here.</p>
              ) : (
                <ul className="space-y-2">
                  {events.rows.map((e) => (
                    <li key={e.id} className="rounded-xl border border-line p-3 text-sm" style={{ background: e.kind === "breach_confirmed" ? "rgba(169,83,95,0.1)" : "var(--sage-fill)" }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tag">{EVENT_LABEL[e.kind]}</span>
                        <span className="text-xs text-muted">{fmtStamp(e.created_at)}{e.trading_day ? ` · trading day ${e.trading_day}` : ""}</span>
                      </div>
                      {e.detail && <p className="mt-1.5">{e.detail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="glass flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">Delete this account</p>
                <p className="text-sm text-muted">Removes the account, its trades and its history. Archive it instead to keep the records.</p>
              </div>
              <button className="btn btn-danger" onClick={removeAccount}>Delete account</button>
            </div>
          </div>
        )}
      </main>
      {editing && <AccountForm account={account} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reloadAccount(); }} />}
      {dialog}
    </div>
  );
}
