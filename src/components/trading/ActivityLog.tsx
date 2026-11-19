"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtDay, todayYMD } from "@/lib/dates";
import { Modal, ErrorNote, useConfirm } from "@/components/ui/Modal";
import { ACTIVITY_CATEGORIES, newId, type Activity } from "@/lib/trading/types";

export function ActivityForm({ activity, onClose, onSaved }: { activity: Activity | null; onClose: () => void; onSaved: () => void }) {
  const [day, setDay] = useState(activity?.day ?? todayYMD());
  const [category, setCategory] = useState(activity?.category ?? ACTIVITY_CATEGORIES[0]);
  const [title, setTitle] = useState(activity?.title === "Activity" ? "" : activity?.title ?? "");
  const [minutes, setMinutes] = useState(activity ? String(activity.minutes) : "");
  const [note, setNote] = useState(activity?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Describe the activity.");
    if (!day) return setError("Pick a date.");
    const m = minutes === "" ? 0 : Number(minutes);
    if (!Number.isInteger(m) || m < 0) return setError("Minutes must be a whole number, 0 or more.");
    setBusy(true);
    const sb = createClient();
    const row = { day, category, title: t, minutes: m, note: note.trim() };
    const { error } = activity
      ? await sb.from("activities").update(row).eq("id", activity.id)
      : await sb.from("activities").insert({ id: newId(), goal_id: "trading", ...row });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }
  return (
    <Modal title={activity ? "Edit activity" : "Log activity"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-d">Date</label>
            <input id="a-d" type="date" className="input" value={day} max={todayYMD()} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="a-c">Category</label>
            <select id="a-c" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {ACTIVITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              {!ACTIVITY_CATEGORIES.includes(category) && <option>{category}</option>}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="a-t">What did you do?</label>
          <input id="a-t" className="input" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-m">Minutes (optional)</label>
            <input id="a-m" type="number" min={0} step={1} className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="a-n">Notes (optional)</label>
          <textarea id="a-n" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
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

export function ActivityLogModal({ activities, onClose, onChange }: { activities: Activity[]; onClose: () => void; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<Activity | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const cats = useMemo(() => [...new Set([...ACTIVITY_CATEGORIES, ...activities.map((a) => a.category)])], [activities]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return activities
      .filter((a) => !cat || a.category === cat)
      .filter((a) => !n || `${a.title} ${a.note} ${a.category}`.toLowerCase().includes(n))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [activities, q, cat]);

  async function remove(a: Activity) {
    if (!(await ask(`Delete the activity “${a.title}” on ${fmtDay(a.day)}?`))) return;
    const { error } = await createClient().from("activities").delete().eq("id", a.id);
    if (error) return setError(error.message);
    onChange();
  }

  return (
    <Modal title="Activity log" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input max-w-xs" type="search" placeholder="Search activities…" aria-label="Search activities" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn btn-sage ml-auto" onClick={() => setEditing("new")}>+ Log activity</button>
      </div>
      <ErrorNote error={error} />
      <p className="my-2 text-xs text-muted">{shown.length} of {activities.length} activities</p>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{activities.length ? "No activities match." : "No activities recorded yet."}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2" style={{ background: "var(--surface)" }}>
              <div className="w-24 shrink-0 text-xs text-muted">{fmtDay(a.day)}</div>
              <div className="min-w-0 flex-1">
                <p><span className="tag mr-2">{a.category}</span>{a.title}</p>
                {(a.minutes > 0 || a.note) && <p className="mt-0.5 text-xs text-muted">{a.minutes > 0 && `${a.minutes} min`}{a.minutes > 0 && a.note && " · "}{a.note}</p>}
              </div>
              <button className="btn btn-sm" onClick={() => setEditing(a)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(a)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      {editing && <ActivityForm activity={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
      {dialog}
    </Modal>
  );
}
