"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal, ErrorNote } from "@/components/ui/Modal";
import type { Account } from "./useLiveData";

type Values = {
  firm: string; label: string; currency: string; size: string; start: string; target: string; maxTrades: string;
  dailyAmt: string; dailyPct: string; overallAmt: string; overallPct: string; drawdown: "static" | "trailing";
  floating: boolean; fees: boolean; tz: string; resetTime: string; warnLow: string; warnHigh: string; notes: string;
};

const blank: Values = {
  firm: "", label: "", currency: "USD", size: "", start: "", target: "", maxTrades: "",
  dailyAmt: "", dailyPct: "5", overallAmt: "", overallPct: "10", drawdown: "static",
  floating: false, fees: false, tz: "America/New_York", resetTime: "17:00", warnLow: "70", warnHigh: "85", notes: "",
};

const fromAccount = (a: Account): Values => ({
  firm: a.firm_name, label: a.account_label, currency: a.currency, size: String(a.account_size), start: String(a.starting_balance),
  target: a.profit_target == null ? "" : String(a.profit_target), maxTrades: a.max_trades_per_day == null ? "" : String(a.max_trades_per_day),
  dailyAmt: a.max_daily_loss == null ? "" : String(a.max_daily_loss), dailyPct: a.max_daily_loss_pct == null ? "" : String(a.max_daily_loss_pct),
  overallAmt: a.max_overall_loss == null ? "" : String(a.max_overall_loss), overallPct: a.max_overall_loss_pct == null ? "" : String(a.max_overall_loss_pct),
  drawdown: a.drawdown_type, floating: a.include_floating, fees: a.include_fees, tz: a.reset_timezone, resetTime: a.reset_time,
  warnLow: String(a.warn_low), warnHigh: String(a.warn_high), notes: a.notes,
});

const opt = (s: string) => (s.trim() === "" ? null : Number(s));
const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "JPY", "PHP"];

function validTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function AccountForm({ account, onClose, onSaved }: { account: Account | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [v, setV] = useState<Values>(account ? fromAccount(account) : blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((x) => ({ ...x, [k]: val }));

  function validate(): string | null {
    const size = Number(v.size), start = Number(v.start);
    if (!v.firm.trim()) return "Enter the prop firm’s name.";
    if (!(size > 0)) return "Enter the account size (above zero).";
    if (!((v.start.trim() === "" ? size : start) >= 0)) return "Enter the starting balance (zero or more).";
    const checks: [string, string][] = [[v.dailyAmt, "daily loss amount"], [v.overallAmt, "overall loss amount"], [v.target, "profit target"]];
    for (const [val, name] of checks) if (val.trim() !== "" && !(Number(val) > 0)) return `The ${name} must be above zero, or left empty.`;
    for (const [val, name] of [[v.dailyPct, "daily loss percentage"], [v.overallPct, "overall loss percentage"]] as const)
      if (val.trim() !== "" && !(Number(val) > 0 && Number(val) <= 100)) return `The ${name} must be between 0 and 100.`;
    if (v.maxTrades.trim() !== "" && !(Number.isInteger(Number(v.maxTrades)) && Number(v.maxTrades) > 0)) return "Max trades per day must be a whole number above zero.";
    if (!validTz(v.tz.trim())) return "Enter a valid timezone, such as America/New_York or Asia/Manila.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.resetTime)) return "Enter the reset time as HH:MM (24-hour), such as 17:00.";
    const lo = Number(v.warnLow), hi = Number(v.warnHigh);
    if (!(lo >= 1 && lo <= 99)) return "The first warning level must be between 1 and 99.";
    if (!(hi >= lo && hi <= 100)) return "The second warning level must be between the first warning level and 100.";
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const bad = validate();
    if (bad) return setError(bad);
    setBusy(true);
    setError(null);
    const row = {
      firm_name: v.firm.trim(), account_label: v.label.trim(), currency: v.currency,
      account_size: Number(v.size), starting_balance: Number(v.start.trim() === "" ? v.size : v.start),
      max_daily_loss: opt(v.dailyAmt), max_daily_loss_pct: opt(v.dailyPct),
      max_overall_loss: opt(v.overallAmt), max_overall_loss_pct: opt(v.overallPct),
      drawdown_type: v.drawdown, include_floating: v.floating, include_fees: v.fees,
      profit_target: opt(v.target), max_trades_per_day: opt(v.maxTrades),
      reset_timezone: v.tz.trim(), reset_time: v.resetTime,
      warn_low: Number(v.warnLow), warn_high: Number(v.warnHigh), notes: v.notes.trim(),
    };
    const sb = createClient();
    if (account) {
      const { error } = await sb.from("prop_accounts").update(row).eq("id", account.id);
      setBusy(false);
      if (error) return setError(error.message);
      onSaved(account.id);
    } else {
      const { data, error } = await sb.from("prop_accounts").insert(row).select("id").single();
      setBusy(false);
      if (error || !data) return setError(error?.message ?? "Could not create the account.");
      onSaved(data.id as string);
    }
  }

  const field = (id: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );

  return (
    <Modal title={account ? "Edit account and risk rules" : "New prop firm account"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="font-display mb-2 text-lg">Account</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("a-firm", "Prop firm", { value: v.firm, maxLength: 120, onChange: (e) => set("firm", e.target.value), autoFocus: !account })}
            {field("a-label", "Account label (optional)", { value: v.label, maxLength: 120, placeholder: "e.g. Challenge #2", onChange: (e) => set("label", e.target.value) })}
            <div>
              <label className="label" htmlFor="a-cur">Currency</label>
              <select id="a-cur" className="input" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {field("a-size", "Account size", { type: "number", min: "0", step: "any", value: v.size, onChange: (e) => set("size", e.target.value) })}
            {field("a-start", "Starting balance", { type: "number", min: "0", step: "any", value: v.start, placeholder: "Same as size if unsure", onChange: (e) => set("start", e.target.value) })}
            {field("a-target", "Profit target (optional)", { type: "number", min: "0", step: "any", value: v.target, onChange: (e) => set("target", e.target.value) })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display mb-2 text-lg">Risk rules</legend>
          <p className="text-xs text-muted">Fill in the amount, the percentage, or both. If both are set, the amount is used. Percentages are of the account size.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("a-dam", "Max daily loss (amount)", { type: "number", min: "0", step: "any", value: v.dailyAmt, onChange: (e) => set("dailyAmt", e.target.value) })}
            {field("a-dpc", "Max daily loss (%)", { type: "number", min: "0", max: "100", step: "any", value: v.dailyPct, onChange: (e) => set("dailyPct", e.target.value) })}
            {field("a-oam", "Max overall loss (amount)", { type: "number", min: "0", step: "any", value: v.overallAmt, onChange: (e) => set("overallAmt", e.target.value) })}
            {field("a-opc", "Max overall loss (%)", { type: "number", min: "0", max: "100", step: "any", value: v.overallPct, onChange: (e) => set("overallPct", e.target.value) })}
            <div>
              <label className="label" htmlFor="a-dd">Overall drawdown</label>
              <select id="a-dd" className="input" value={v.drawdown} onChange={(e) => set("drawdown", e.target.value as "static" | "trailing")}>
                <option value="static">Static: measured from the starting balance</option>
                <option value="trailing">Trailing: measured from the highest balance</option>
              </select>
            </div>
            {field("a-max", "Max trades per day (optional)", { type: "number", min: "1", step: "1", value: v.maxTrades, onChange: (e) => set("maxTrades", e.target.value) })}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.floating} onChange={(e) => set("floating", e.target.checked)} className="accent-[var(--sage-deep)]" /> Count open (floating) profit and loss</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.fees} onChange={(e) => set("fees", e.target.checked)} className="accent-[var(--sage-deep)]" /> Subtract fees from P/L</label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display mb-2 text-lg">Daily reset and alerts</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("a-tz", "Reset timezone", { value: v.tz, maxLength: 64, onChange: (e) => set("tz", e.target.value) })}
            {field("a-rt", "Reset time (24-hour)", { value: v.resetTime, placeholder: "17:00", onChange: (e) => set("resetTime", e.target.value) })}
            {field("a-wl", "First warning at (% of limit)", { type: "number", min: "1", max: "99", value: v.warnLow, onChange: (e) => set("warnLow", e.target.value) })}
            {field("a-wh", "Critical warning at (% of limit)", { type: "number", min: "1", max: "100", value: v.warnHigh, onChange: (e) => set("warnHigh", e.target.value) })}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="a-notes">Notes (optional)</label>
          <textarea id="a-notes" className="input" rows={2} maxLength={5000} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : account ? "Save changes" : "Create account"}</button>
        </div>
      </form>
    </Modal>
  );
}
