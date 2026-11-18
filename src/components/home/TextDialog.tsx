"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";

/** A small dialog with one text field, used to add or rename a habit or a task. */
export function TextDialog({
  title,
  label,
  initial = "",
  max = 140,
  submit = "Save",
  onSave,
  onClose,
}: {
  title: string;
  label: string;
  initial?: string;
  max?: number;
  submit?: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return setError("Give it a short title first.");
    setBusy(true);
    setError(null);
    try {
      await onSave(t.slice(0, max));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={go} className="space-y-4">
        <div>
          <label className="label" htmlFor="text-dialog-field">{label}</label>
          <input id="text-dialog-field" className="input" value={value} maxLength={max} autoFocus onChange={(e) => setValue(e.target.value)} />
        </div>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : submit}</button>
        </div>
      </form>
    </Modal>
  );
}
