"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal, ErrorNote } from "@/components/ui/Modal";

export type Strategy = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "archived";
  currency: string;
  starting_balance: number;
  target_pl: number | null;
  columns: unknown;
  created_at: string;
};

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "JPY", "PHP"];

export function StrategyForm({ strategy, onClose, onSaved }: { strategy: Strategy | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState(strategy?.name ?? "");
  const [description, setDescription] = useState(strategy?.description ?? "");
  const [category, setCategory] = useState(strategy?.category ?? "");
  const [currency, setCurrency] = useState(strategy?.currency ?? "USD");
  const [start, setStart] = useState(strategy ? String(strategy.starting_balance) : "10000");
  const [target, setTarget] = useState(strategy?.target_pl != null ? String(strategy.target_pl) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const balance = Number(start);
    const tgt = target.trim() === "" ? null : Number(target);
    if (!n) return setError("Give the strategy a name.");
    if (!Number.isFinite(balance) || balance < 0) return setError("The starting balance must be zero or more.");
    if (tgt !== null && (!Number.isFinite(tgt) || tgt <= 0)) return setError("The target must be above zero, or left empty.");
    setBusy(true);
    setError(null);
    const sb = createClient();
    const row = { name: n, description: description.trim(), category: category.trim(), currency, starting_balance: balance, target_pl: tgt };
    if (strategy) {
      const { error } = await sb.from("strategies").update(row).eq("id", strategy.id);
      setBusy(false);
      if (error) return setError(error.message);
      onSaved(strategy.id);
    } else {
      const { data, error } = await sb.from("strategies").insert(row).select("id").single();
      setBusy(false);
      if (error || !data) return setError(error?.message ?? "Could not create the strategy.");
      onSaved(data.id as string);
    }
  }

  return (
    <Modal title={strategy ? "Edit strategy" : "New strategy"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="s-name">Strategy name</label>
          <input id="s-name" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="s-cat">Category (optional)</label>
            <input id="s-cat" className="input" value={category} maxLength={80} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-cur">Currency</label>
            <select id="s-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="s-bal">Starting balance</label>
            <input id="s-bal" className="input" type="number" min="0" step="any" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-tgt">Profit target (optional)</label>
            <input id="s-tgt" className="input" type="number" min="0" step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="s-desc">Description (optional)</label>
          <textarea id="s-desc" className="input" rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save strategy"}</button>
        </div>
      </form>
    </Modal>
  );
}
