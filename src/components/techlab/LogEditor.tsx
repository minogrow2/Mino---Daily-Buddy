"use client";

import { useState, type FormEvent } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { ErrorNote, Modal, useConfirm } from "@/components/ui/Modal";
import { plainOf } from "@/lib/notes";
import { uploadImage } from "@/lib/media";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import type { TechLog } from "@/lib/willow/techlab";
import { removePhotos, saveProjectLog } from "@/lib/willow/techlab-actions";

const MAX_PER_PICK = 6;
const PLACEHOLDER = "What did you try? What broke? What finally worked? Bold, lists and quotes are all fine.";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Writes or edits one log entry: date, rich text and screenshots. Screenshots added here are kept only
 * when the log is saved; Cancel removes them again.
 */
export function LogEditor({
  projectId,
  projectTitle,
  log,
  day: startDay,
  onSaved,
  onClose,
}: {
  projectId: string;
  projectTitle: string;
  log: TechLog | null;
  day: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [logId] = useState(() => log?.id ?? crypto.randomUUID());
  const [start] = useState(() => (log ? log.html || (log.text ? `<p>${escapeHtml(log.text)}</p>` : "") : ""));
  const [day, setDay] = useState(startDay);
  const [html, setHtml] = useState(start);
  const [photos, setPhotos] = useState<string[]>(log?.photos ?? []);
  const [fresh, setFresh] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { ask, dialog: confirm } = useConfirm();
  const urls = usePhotoUrls(photos);
  const originals = log?.photos ?? [];

  async function addPhotos(picked: File[]) {
    const files = picked.slice(0, MAX_PER_PICK);
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    const ids: string[] = [];
    let reason = "";
    for (const f of files) {
      try {
        ids.push(await uploadImage(f));
      } catch (e) {
        reason = errorText(e);
      }
    }
    setBusy(false);
    if (ids.length) {
      setPhotos((p) => [...p, ...ids]);
      setFresh((f) => [...f, ...ids]);
    }
    if (ids.length < files.length) setErr(reason || "A screenshot couldn’t be read here. Try a JPEG or PNG.");
  }

  async function removePhoto(id: string) {
    if (!(await ask("Remove this screenshot from the log?", "Remove"))) return;
    setPhotos((p) => p.filter((x) => x !== id));
    if (fresh.includes(id)) {
      setFresh((f) => f.filter((x) => x !== id));
      void removePhotos([id]);
    }
  }

  function close() {
    if (fresh.length) void removePhotos(fresh);
    onClose();
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!day) {
      setErr("Pick a date.");
      return;
    }
    const text = plainOf(html);
    if (!text && !photos.length) {
      setErr("Write something or add a screenshot first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await saveProjectLog({
        id: logId,
        projectId,
        day,
        html,
        text,
        photoIds: photos,
        removedPhotoIds: originals.filter((x) => !photos.includes(x)),
      });
      onSaved();
    } catch (er) {
      setErr(errorText(er));
      setBusy(false);
    }
  }

  return (
    <>
      <Modal title={log ? "Edit log entry" : "New log entry"} eyebrow={projectTitle} onClose={close} wide>
        <form onSubmit={save} className="log-editor" style={{ display: "grid", gap: 10 }}>
          <label className="log-date-label">
            Date
            <input className="winput" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <MiniEditor html={start} label="Log entry" placeholder={PLACEHOLDER} onChange={setHtml} />
          <div className="row-inline" style={{ justifyContent: "space-between" }}>
            <label className="wbtn soft small photo-add">
              + Add screenshot
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void addPhotos(files);
                }}
              />
            </label>
            <span className="small muted">Screenshots are saved to your account.</span>
          </div>
          {photos.length ? (
            <div className="log-photos">
              {photos.map((id) => (
                <figure key={id} className="photo">
                  {urls[id] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[id]} alt="Screenshot in this log" loading="lazy" />
                  )}
                  <figcaption>
                    <button type="button" className="wbtn ghost small" onClick={() => removePhoto(id)}>
                      Remove
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="small muted">No screenshot yet.</p>
          )}
          <ErrorNote error={err} />
          <div className="actions">
            <button type="button" className="wbtn ghost small" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="wbtn primary small" disabled={busy}>
              {busy ? "Saving…" : "Save log"}
            </button>
          </div>
        </form>
      </Modal>
      {confirm}
    </>
  );
}
