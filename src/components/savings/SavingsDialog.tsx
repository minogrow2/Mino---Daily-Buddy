"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import type { SavingsEntry, SavingsKind } from "@/lib/willow/savings";
import { addSavingsEntry, updateSavingsEntry } from "@/lib/willow/savings-actions";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Records a deposit or a withdrawal, or edits an existing record. Only what was actually moved is recorded. */
export function SavingsDialog({
  entry,
  initialKind,
  today,
  onSaved,
  onClose,
}: {
  entry: SavingsEntry | null;
  initialKind: SavingsKind;
  today: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SavingsKind>(entry?.kind ?? initialKind);
  const [day, setDay] = useState(entry?.day ?? today);
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = entry ? "Edit record" : kind === "deposit" ? "Record a deposit" : "Record a withdrawal";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Math.round(Number(amount));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setErr("Choose a date.");
      return;
    }
    if (amount.trim() === "" || !Number.isFinite(value) || value < 1) {
      setErr("Enter an amount of at least ₱1.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const row = { day, kind, amount: value, note: note.trim() };
      if (entry) await updateSavingsEntry(entry.id, row);
      else await addSavingsEntry(row);
      onSaved();
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} eyebrow="Savings · PHP" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <p className="small muted">Only what you actually moved. Nothing is carried over automatically.</p>
        <label>
          Date
          <input className="winput" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          Kind
          <select className="winput" value={kind} onChange={(e) => setKind(e.target.value as SavingsKind)}>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </label>
        <label>
          Amount (PHP)
          <input
            className="winput"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Note <span className="small muted">optional</span>
          <input className="winput" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="actions">
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
