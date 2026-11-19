"use client";

import { useState, type FormEvent } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import { htmlFromBody, JOURNAL_TYPES } from "@/lib/journal";
import { plainOf } from "@/lib/notes";
import { saveJournalEntry } from "@/lib/willow/actions";
import type { JournalEntry } from "@/lib/willow/types";

/** Write or edit one journal entry: date, type, title, rich text and tags. */
export function EntryDialog({
  entry,
  defaultDay,
  onSaved,
  onClose,
}: {
  entry: JournalEntry | null;
  defaultDay: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [start] = useState(() => entry?.html || htmlFromBody(entry?.body ?? ""));
  const [html, setHtml] = useState(start);
  const [day, setDay] = useState(entry?.day ?? defaultDay);
  const [type, setType] = useState(entry?.type ?? "daily");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [tags, setTags] = useState(entry ? entry.tags.join(", ") : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = plainOf(html).trim();
    if (!body) return setErr("Write a line first.");
    if (!day) return setErr("Pick a date.");
    setBusy(true);
    setErr(null);
    try {
      const list = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12);
      await saveJournalEntry({ id: entry?.id ?? null, day, type, title: title.trim().slice(0, 120), html, body, tags: list });
      onSaved();
      onClose();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={entry ? "Edit entry" : "New journal entry"} onClose={onClose} wide>
      <form onSubmit={save} className="dlg" style={{ padding: 0 }}>
        <label>
          Date
          <input className="winput" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          Type
          <select className="winput" value={type} onChange={(e) => setType(e.target.value)}>
            {JOURNAL_TYPES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input className="winput" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div>
          <span className="small">Write freely</span>
          <div style={{ marginTop: 6 }}>
            <MiniEditor html={start} label="Write freely" placeholder="Write freely. It doesn’t need to be long." onChange={setHtml} />
          </div>
        </div>
        <label>
          Tags <span className="small muted">comma separated</span>
          <input className="winput" value={tags} maxLength={200} placeholder="family, ideas" onChange={(e) => setTags(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="actions">
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Cancel
          </button>
          <button className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : "Save entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
