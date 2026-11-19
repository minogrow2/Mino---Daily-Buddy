"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayYMD } from "@/lib/dates";
import { useRows } from "../useRows";
import { FlexTable } from "../trades/FlexTable";
import { AnalyticsView } from "./AnalyticsView";
import { StrategyForm, type Strategy } from "./StrategyForm";
import { money, numText, pctText, resolveColumns, type ColumnDef } from "@/lib/trading/columns";
import { equitySeries, summarize, type TradeRow } from "@/lib/trading/metrics";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";

type Trade = TradeRow & {
  strategy_id: string;
  screenshot_id: string | null;
  market: string;
  direction: string;
  lot_size: number | null;
  emotion: string;
  explanation: string;
  extra: Record<string, unknown>;
};

type Tab = "trades" | "analytics" | "compare";

export function AnalyticsHome() {
  const sb = useMemo(() => createClient(), []);
  const strategies = useRows<Strategy>("strategies", null, [{ column: "created_at" }]);
  const trades = useRows<Trade>("backtest_trades", null, [{ column: "trade_date" }, { column: "position" }]);
  const [selId, setSelId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [tab, setTab] = useState<Tab>("trades");
  const [editing, setEditing] = useState<Strategy | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const all = strategies.rows ?? [];
  const list = all.filter((s) => showArchived || s.status === "active");
  const sel = list.find((s) => s.id === selId) ?? list[0] ?? null;
  const loadError = strategies.error ?? trades.error;

  const mine = useMemo(() => (sel && trades.rows ? trades.rows.filter((t) => t.strategy_id === sel.id) : []), [sel, trades.rows]);
  const columns = useMemo<ColumnDef[]>(() => (sel ? resolveColumns(sel.columns, "backtest") : []), [sel]);
  const pctById = useMemo(() => {
    if (!sel) return {};
    return Object.fromEntries(equitySeries(mine, sel.starting_balance).map((p) => [p.trade_id, p.pctChange]));
  }, [mine, sel]);
  const compare = useMemo(
    () => list.map((s) => ({ s, sum: summarize((trades.rows ?? []).filter((t) => t.strategy_id === s.id), s.starting_balance) })),
    [list, trades.rows],
  );

  async function addRow() {
    if (!sel) return;
    const { error } = await sb.from("backtest_trades").insert({ strategy_id: sel.id, trade_date: todayYMD(), position: mine.length });
    if (error) throw new Error(error.message);
    await trades.reload();
  }
  async function patchRow(id: string, patch: Record<string, unknown>) {
    const { error } = await sb.from("backtest_trades").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await trades.reload();
  }
  async function deleteRows(ids: string[]) {
    const { error } = await sb.from("backtest_trades").delete().in("id", ids);
    if (error) throw new Error(error.message);
    await trades.reload();
  }
  async function saveColumns(cols: ColumnDef[]) {
    if (!sel) return;
    const { error } = await sb.from("strategies").update({ columns: cols }).eq("id", sel.id);
    if (error) throw new Error(error.message);
    await strategies.reload();
  }
  async function setStatus(s: Strategy, status: "active" | "archived") {
    const { error } = await sb.from("strategies").update({ status }).eq("id", s.id);
    if (error) return setError(error.message);
    setError(null);
    strategies.reload();
  }
  async function removeStrategy(s: Strategy) {
    const n = (trades.rows ?? []).filter((t) => t.strategy_id === s.id).length;
    const msg = n
      ? `Delete “${s.name}” and its ${n} trade${n === 1 ? "" : "s"}? This can’t be undone. Archive it instead to keep the records.`
      : `Delete “${s.name}”? This can’t be undone.`;
    if (!(await ask(msg))) return;
    const { error } = await sb.from("strategies").delete().eq("id", s.id);
    if (error) return setError(error.message);
    setSelId(null);
    strategies.reload();
    trades.reload();
  }

  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
        <header className="glass overflow-hidden">
          <div className="relative h-32 sm:h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/ft/analytics.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
            <div className="relative flex h-full flex-col justify-end p-5 text-white">
              <Link href="/goals/finance-trading" className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur-md hover:bg-white/30">← Finance Trading</Link>
              <h1 className="font-display text-3xl sm:text-4xl">Backtesting Analytics</h1>
            </div>
          </div>
          <p className="p-4 text-sm text-muted">Each strategy keeps its own trades and statistics. Choose one strategy at a time, or compare them side by side without mixing their trades.</p>
        </header>

        <ErrorNote error={loadError ?? error} />

        {strategies.rows === null ? (
          <p className="py-10 text-center text-sm text-muted">Loading…</p>
        ) : (
          <>
            <section className="glass flex flex-wrap items-center gap-2 p-3" aria-label="Strategies">
              {list.map((s) => (
                <button key={s.id} aria-pressed={sel?.id === s.id} onClick={() => setSelId(s.id)} className={`rounded-full px-3 py-1.5 text-sm transition ${sel?.id === s.id ? "text-white" : "text-muted hover:text-fg"}`} style={sel?.id === s.id ? { background: "var(--sage-deep)" } : { background: "var(--sage-fill)" }}>
                  {s.name}{s.status === "archived" ? " · archived" : ""}
                </button>
              ))}
              {list.length === 0 && <span className="text-sm text-muted">{showArchived ? "No strategies yet." : "No active strategies. Create one to start."}</span>}
              <label className="ml-auto flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--sage-deep)]" /> Show archived
              </label>
              <button className="btn btn-sage btn-sm" onClick={() => setEditing("new")}>+ New strategy</button>
            </section>

            {!sel ? (
              <div className="glass p-10 text-center">
                <p className="font-display text-xl">Create your first strategy</p>
                <p className="mt-1 text-sm text-muted">Each strategy gets its own trade table, statistics, and calendar.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl">{sel.name}</h2>
                  {sel.category && <span className="tag">{sel.category}</span>}
                  <span className="text-sm text-muted">Starting balance {money(sel.starting_balance, sel.currency)}</span>
                  <div className="ml-auto flex gap-2">
                    <button className="btn btn-sm" onClick={() => setEditing(sel)}>Edit</button>
                    <button className="btn btn-sm" onClick={() => setStatus(sel, sel.status === "active" ? "archived" : "active")}>{sel.status === "active" ? "Archive" : "Restore"}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeStrategy(sel)}>Delete</button>
                  </div>
                </div>
                {sel.description && <p className="text-sm text-muted">{sel.description}</p>}

                <div className="glass inline-flex p-1" role="tablist" aria-label="Analytics sections">
                  {([["trades", "Trades"], ["analytics", "Statistics"], ["compare", "Compare strategies"]] as const).map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? "text-white" : "text-muted hover:text-fg"}`} style={tab === k ? { background: "var(--sage-deep)" } : undefined}>
                      {l}
                    </button>
                  ))}
                </div>

                {tab === "trades" && (
                  <FlexTable
                    scope="backtest"
                    columns={columns}
                    rows={mine}
                    urls={trades.urls}
                    pctById={pctById}
                    currency={sel.currency}
                    csvName={`${sel.name} backtest trades`}
                    onColumnsChange={saveColumns}
                    onCreate={addRow}
                    onPatch={patchRow}
                    onDelete={deleteRows}
                  />
                )}

                {tab === "analytics" && trades.rows !== null && (
                  <AnalyticsView trades={mine} startingBalance={sel.starting_balance} currency={sel.currency} today={todayYMD()} profitTarget={sel.target_pl} />
                )}

                {tab === "compare" && (
                  <div className="glass overflow-x-auto p-4">
                    <p className="mb-3 text-sm text-muted">Each row uses only that strategy’s trades and starting balance.</p>
                    <table className="w-full min-w-max text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted">
                          <th className="px-2 py-2">Strategy</th>
                          <th className="px-2 py-2">Trades</th>
                          <th className="px-2 py-2">Win rate</th>
                          <th className="px-2 py-2">Net P/L</th>
                          <th className="px-2 py-2">Profit factor</th>
                          <th className="px-2 py-2">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compare.map(({ s, sum }) => (
                          <tr key={s.id} className="border-t border-line">
                            <td className="px-2 py-2"><button className="font-medium hover:underline" onClick={() => { setSelId(s.id); setTab("trades"); }}>{s.name}</button></td>
                            <td className="px-2 py-2">{sum.total}</td>
                            <td className="px-2 py-2">{sum.winRate === null ? "—" : `${sum.winRate.toFixed(1)}%`}</td>
                            <td className="px-2 py-2">{money(sum.netPL, s.currency)}</td>
                            <td className="px-2 py-2">{sum.profitFactor === "infinite" ? "∞" : numText(sum.profitFactor)}</td>
                            <td className="px-2 py-2">{pctText(sum.growthPct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {compare.length === 0 && <p className="py-6 text-center text-sm text-muted">No strategies to compare yet.</p>}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      {editing && (
        <StrategyForm
          strategy={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => { setEditing(null); setSelId(id); strategies.reload(); }}
        />
      )}
      {dialog}
    </div>
  );
}
