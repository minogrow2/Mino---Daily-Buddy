"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtDay } from "@/lib/dates";
import { Modal, ErrorNote, useConfirm } from "@/components/ui/Modal";
import { MILESTONE_HORIZONS, newId, type Milestone } from "@/lib/trading/types";

export function Milestones({ items, onChange }: { items: Milestone[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();
  const done = items.filter((m) => m.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const sorted = [...items].sort((a, b) =>
    a.done !== b.done ? (a.done ? 1 : -1) : (a.due_day ?? "9999").localeCompare(b.due_day ?? "9999") || a.created_at.localeCompare(b.created_at),
  );

  async function toggle(m: Milestone) {
    const { error } = await createClient().from("milestones").update({ done: !m.done }).eq("id", m.id);
    if (error) return setError(error.message);
    setError(null);
    onChange();
  }
  async function remove(m: Milestone) {
    if (!(await ask(`Delete the milestone “${m.title}”?`))) return;
    const { error } = await createClient().from("milestones").delete().eq("id", m.id);
    if (error) return setError(error.message);
    setError(null);
    onChange();
  }

  return (
    <section className="glass p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Milestones</h2>
        <button className="btn btn-sage btn-sm" onClick={() => setEditing("new")}>
          + Milestone
        </button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>
            {done} of {items.length} completed
          </span>
          <span>{pct}%</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Milestone progress">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No milestones yet. Add a short-term, weekly, monthly or long-term target.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((m) => (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${m.done ? "border-transparent opacity-80" : "border-line"}`}
              style={{ background: m.done ? "var(--sage-fill)" : "var(--surface)" }}
            >
              <input
                type="checkbox"
                checked={m.done}
                onChange={() => toggle(m)}
                aria-label={`Mark “${m.title}” ${m.done ? "not done" : "done"}`}
                className="h-5 w-5 accent-[var(--sage-deep)]"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate ${m.done ? "line-through" : ""}`}>
                  {m.done && <span aria-hidden>✓ </span>}
                  {m.title}
                </p>
                <p className="text-xs text-muted">
                  {m.horizon && <span className="tag mr-2">{m.horizon}</span>}
                  {m.due_day ? `Due ${fmtDay(m.due_day)}` : "No due date"}
                </p>
              </div>
              <button className="btn btn-sm" onClick={() => setEditing(m)}>
                Edit
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <MilestoneForm
          milestone={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
      {dialog}
    </section>
  );
}

function MilestoneForm({ milestone, onClose, onSaved }: { milestone: Milestone | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [horizon, setHorizon] = useState(milestone?.horizon ?? "Short-term");
  const [due, setDue] = useState(milestone?.due_day ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Give the milestone a title.");
    setBusy(true);
    const sb = createClient();
    const row = { title: t, horizon, due_day: due || null };
    const { error } = milestone
      ? await sb.from("milestones").update(row).eq("id", milestone.id)
      : await sb.from("milestones").insert({ id: newId(), goal_id: "trading", ...row });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }
  return (
    <Modal title={milestone ? "Edit milestone" : "New milestone"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="ms-title">Title</label>
          <input id="ms-title" className="input" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ms-h">Horizon</label>
            <select id="ms-h" className="input" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {MILESTONE_HORIZONS.map((h) => <option key={h}>{h}</option>)}
              {horizon && !MILESTONE_HORIZONS.includes(horizon) && <option>{horizon}</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ms-d">Due date (optional)</label>
            <input id="ms-d" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
