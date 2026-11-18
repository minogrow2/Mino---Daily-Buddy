"use client";

import { ymd, fmtDay } from "@/lib/dates";
import { Modal } from "@/components/ui/Modal";
import type { Note } from "@/lib/notes";
import { MiniEditor } from "./MiniEditor";

/** A saved note opened as a page: its date, its text and photos, and pin, edit, delete and close. */
export function NoteDialog({
  note,
  urls,
  onClose,
  onPin,
  onEdit,
  onDelete,
}: {
  note: Note;
  urls: Record<string, string>;
  onClose: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const when = fmtDay(ymd(note.created_at), { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hasText = note.html.replace(/<[^>]+>/g, "").trim() !== "";
  return (
    <Modal title={note.pinned ? "Pinned note" : "A saved note"} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-muted">{when}</p>
        {hasText ? <MiniEditor html={note.html} label="Saved note" readOnly /> : <p className="text-sm text-muted">Only photos in this note.</p>}
        {note.photos.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {note.photos.map((id) => (
              <figure key={id} className="photo">
                {urls[id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[id]} alt="Photo from this note" loading="lazy" />
                )}
              </figure>
            ))}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-sm" onClick={onPin} aria-pressed={note.pinned}>{note.pinned ? "Unpin" : "Pin to the top"}</button>
          <button type="button" className="btn btn-sm" onClick={onEdit}>Edit this note</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>Delete</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
