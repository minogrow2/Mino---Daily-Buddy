"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRows } from "../useRows";
import { useLiveSettings, type Account } from "./useLiveData";
import { AccountForm } from "./AccountForm";
import { fmtDay } from "@/lib/dates";
import { money } from "@/lib/trading/columns";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";

const STATUS_TAG: Record<Account["status"], string> = { active: "Active", passed: "Passed", breached: "Breached", archived: "Archived" };

export function LiveHome() {
  const { settings, error: setErr, reload, setError } = useLiveSettings();
  const accounts = useRows<Account>("prop_accounts", null, [{ column: "created_at" }]);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();
  const { ask, dialog } = useConfirm();

  async function setActivated(on: boolean) {
    const { error } = await createClient()
      .from("live_settings")
      .upsert({ activated: on, activated_at: on ? new Date().toISOString() : null }, { onConflict: "user_id" });
    if (error) return setError(error.message);
    setError(null);
    reload();
  }

  async function activate() {
    if (!(await ask('Turn on live trading? This unlocks prop firm accounts, risk tracking, and calculators. Nothing is connected to your broker: you enter every trade yourself. You can turn it off again at any time.', 'Turn on'))) return;
    setActivated(true);
  }
  async function deactivate() {
    if (!(await ask('Turn off live trading? Your accounts and trades are kept, but the Live Trading workspace will be hidden until you turn it on again.', 'Turn off'))) return;
    setActivated(false);
  }

  const err = setErr ?? accounts.error;
  const list = (accounts.rows ?? []).filter((a) => showArchived || a.status !== "archived");

  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
        <header className="glass overflow-hidden">
          <div className="relative h-36 sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/ft/live.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
            <div className="relative flex h-full flex-col justify-end p-5 text-white">
              <Link href="/goals/finance-trading" className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur-md hover:bg-white/30">← Finance Trading</Link>
              <h1 className="font-display text-3xl sm:text-4xl">Live Trading</h1>
            </div>
          </div>
        </header>
        <ErrorNote error={err} />

        {settings === null ? (
          <p className="py-10 text-center text-sm text-muted">Loading…</p>
        ) : !settings.activated ? (
          <div className="glass glass-butter space-y-4 p-6 text-center sm:p-10">
            <span className="tape" aria-hidden />
            <p className="font-display text-2xl">Live trading is off</p>
            <p className="mx-auto max-w-xl text-sm text-muted">
              This workspace is for real trading on prop firm accounts. It tracks your daily and overall loss limits, profit targets, and trade history.
              Trades are entered by hand. Turning it on does not connect to any broker, and you can turn it off at any time.
            </p>
            <button className="btn btn-primary" onClick={activate}>ACTIVATE LIVE TRADING</button>
          </div>
        ) : (
          <>
            <section className="glass flex flex-wrap items-center gap-2 p-4">
              <div>
                <p className="font-display text-xl">Prop firm accounts</p>
                <p className="text-xs text-muted">Live since {settings.activated_at ? fmtDay(settings.activated_at.slice(0, 10)) : "today"}</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--sage-deep)]" /> Show archived
                </label>
                <Link href="/goals/finance-trading/live/tools" className="btn btn-sm">Calculators and checklist</Link>
                <button className="btn btn-sage btn-sm" onClick={() => setCreating(true)}>+ New account</button>
                <button className="btn btn-sm" onClick={deactivate}>Turn off live trading</button>
              </div>
            </section>

            {accounts.rows === null ? (
              <p className="py-10 text-center text-sm text-muted">Loading accounts…</p>
            ) : list.length === 0 ? (
              <div className="glass p-10 text-center">
                <p className="font-display text-xl">{showArchived ? "No archived accounts" : "No accounts yet"}</p>
                {!showArchived && <p className="mt-1 text-sm text-muted">Add your first prop firm account to start tracking its risk rules.</p>}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/goals/finance-trading/live/accounts/${a.id}`} className="glass block p-5 transition hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display truncate text-xl">{a.firm_name}</p>
                          <p className="truncate text-sm text-muted">{a.account_label || "No label"}</p>
                        </div>
                        <span className="tag shrink-0">{STATUS_TAG[a.status]}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div><p className="text-xs text-muted">Account size</p><p>{money(a.account_size, a.currency)}</p></div>
                        <div><p className="text-xs text-muted">Reset</p><p>{a.reset_time} {a.reset_timezone}</p></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      {creating && (
        <AccountForm account={null} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); router.push(`/goals/finance-trading/live/accounts/${id}`); }} />
      )}
      {dialog}
    </div>
  );
}
