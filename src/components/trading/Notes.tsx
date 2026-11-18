"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtStamp } from "@/lib/dates";
import { Modal, ErrorNote, useConfirm } from "@/components/ui/Modal";
import { RichEditor } from "@/components/editor/RichEditor";
import { newId, type Note } from "@/lib/trading/types";

const plain = (html: string) => new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";

export function Notes() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("goal_notes").select("id,html,pinned,created_at,updated_at").eq("goal_id", "trading");
    if (error) setError(error.message);
    else setNotes((data as Note[]).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
  }, [load]);

  async function pin(n: Note) {
    const { error } = await createClient().from("goal_notes").update({ pinned: !n.pinned }).eq("id", n.id);
    if (error) setError(error.message);
    else load();
  }
  async function remove(n: Note) {
    if (!(await ask("Delete this note?"))) return;
    const { error } = await createClient().from("goal_notes").delete().eq("id", n.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <section className="glass p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Notes</h2>
        <button className="btn btn-sage btn-sm" onClick={() => setEditing("new")}>+ Note</button>
      </div>
      <div className="mt-3"><ErrorNote error={error} /></div>
      {notes === null ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No notes yet. Capture quick thoughts about markets and setups.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-line px-3 py-2" style={{ background: "var(--surface)" }}>
              <p className="line-clamp-3 text-sm">{n.pinned && <span aria-label="Pinned">📌 </span>}{plain(n.html) || "(empty note)"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-auto text-xs text-muted">Updated {fmtStamp(n.updated_at)}</span>
                <button className="btn btn-sm" onClick={() => pin(n)}>{n.pinned ? "Unpin" : "Pin"}</button>
                <button className="btn btn-sm" onClick={() => setEditing(n)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(n)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <NoteForm note={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {dialog}
    </section>
  );
}

function NoteForm({ note, onClose, onSaved }: { note: Note | null; onClose: () => void; onSaved: () => void }) {
  const [html, setHtml] = useState(note?.html ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!plain(html)) return setError("Write something first.");
    setBusy(true);
    const sb = createClient();
    const now = new Date().toISOString();
    const { error } = note
      ? await sb.from("goal_notes").update({ html, updated_at: now }).eq("id", note.id)
      : await sb.from("goal_notes").insert({ id: newId(), goal_id: "trading", html });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }
  return (
    <Modal title={note ? "Edit note" : "New note"} onClose={onClose} wide>
      <RichEditor variant="compact" content={note?.html ?? ""} onChange={(_, h) => setHtml(h)} placeholder="Write a note…" onError={setError} />
      <div className="mt-3"><ErrorNote error={error} /></div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save note"}</button>
      </div>
    </Modal>
  );
}
