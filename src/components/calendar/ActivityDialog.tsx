"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import { addActivity, updateActivity } from "@/lib/willow/actions";
import { CATS } from "@/lib/willow/constants";

/** Log an activity on a day, or edit one. The kind decides whether it counts as offline time. */
export function ActivityDialog({
  day,
  row,
  onSaved,
  onClose,
}: {
  day: string;
  row: { id: string; title: string; category: string; minutes: number } | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [date, setDate] = useState(day);
  const [category, setCategory] = useState(row?.category ?? "social");
  const [minutes, setMinutes] = useState(row?.minutes ? String(row.minutes) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("What did you do?");
    if (!date) return setErr("Pick a date.");
    setBusy(true);
    setErr(null);
    const payload = { title: t, category, minutes: Math.max(0, Number(minutes) || 0), offline: !!CATS[category]?.offline };
    try {
      if (row) await updateActivity(row.id, { ...payload, day: date });
      else await addActivity(date, payload);
      onSaved();
      onClose();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={row ? "Edit activity" : "Log activity"} onClose={onClose}>
      <form onSubmit={save} className="dlg" style={{ padding: 0 }}>
        <label>
          What did you do?
          <input className="winput" value={title} maxLength={120} autoFocus onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Date
          <input className="winput" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Kind
          <select className="winput" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATS).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes <span className="small muted">optional</span>
          <input className="winput" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="actions">
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Cancel
          </button>
          <button className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
