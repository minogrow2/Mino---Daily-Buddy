"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay, ymd } from "@/lib/dates";
import { deleteMedia, uploadImage } from "@/lib/media";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import {
  EMPTY_DRAFT,
  createNote,
  deleteNote,
  loadDraft,
  loadNotes,
  plainOf,
  richIsEmpty,
  saveDraft,
  setPinned,
  updateNote,
  type Draft,
  type GoalKey,
  type Note,
} from "@/lib/notes";
import { MiniEditor } from "./MiniEditor";
import { NoteDialog } from "./NoteDialog";
import { PinIcon } from "./PinIcon";

const TONES = ["pink", "butter", "sage"] as const;
const MAX_PHOTOS_PER_PICK = 6;
const AUTOSAVE_MS = 800;
const PLACEHOLDER = "Write what you are thinking. Bold, lists and quotes are all fine.";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/**
 * The notes block every goal shares: a rich-text composer with photos (autosaved as a draft), then the
 * scrapbook of saved notes. Pinned notes come first. Open a note to read it, pin it, edit it or delete it.
 */
export function GoalNotes({ goal, name }: { goal: GoalKey; name: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [view, setView] = useState<Draft | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { ask, dialog } = useConfirm();
  const sectionRef = useRef<HTMLElement>(null);
  // The draft as it is being written. The editor reports each change here; saves read from here.
  const latest = useRef<Draft>(EMPTY_DRAFT);
  const pendingSave = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!pendingSave.current) return;
    pendingSave.current = false;
    try {
      await saveDraft(goal, latest.current);
    } catch (e) {
      pendingSave.current = true;
      setError(errorText(e));
    }
  }, [goal]);

  const queueSave = useCallback(() => {
    pendingSave.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist();
    }, AUTOSAVE_MS);
  }, [persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingSave.current) {
        void persist();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void persist();
    };
  }, [persist]);

  const refresh = useCallback(async () => {
    try {
      setNotes(await loadNotes(goal));
    } catch (e) {
      setError(errorText(e));
    }
  }, [goal]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, draft] = await Promise.all([loadNotes(goal), loadDraft(goal)]);
        if (!alive) return;
        latest.current = draft;
        setNotes(list);
        setView(draft);
        setComposerKey((k) => k + 1);
        setError(null);
      } catch (e) {
        if (alive) setError(errorText(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [goal]);

  const all = notes ?? [];
  const openNote = openId ? (all.find((n) => n.id === openId) ?? null) : null;
  const editId = view?.editId ?? null;
  const originals = all.find((n) => n.id === editId)?.photos ?? [];
  const pinned = all.filter((n) => n.pinned);
  const rest = all.filter((n) => !n.pinned);
  const urls = usePhotoUrls([...all.flatMap((n) => n.photos), ...(view?.photoIds ?? [])]);

  /** Deletes the photos a draft added this session. The photos of the note being edited are kept. */
  function dropFreshPhotos(d: Draft) {
    const keep = all.find((n) => n.id === d.editId)?.photos ?? [];
    for (const id of d.photoIds) if (!keep.includes(id)) deleteMedia(id).catch(() => {});
  }

  function onHtml(html: string) {
    latest.current = { ...latest.current, html };
    queueSave();
  }

  function setPhotoIds(photoIds: string[]) {
    latest.current = { ...latest.current, photoIds };
    setView(latest.current);
    queueSave();
  }

  async function saveNow() {
    pendingSave.current = true;
    await persist();
  }

  async function resetComposer() {
    latest.current = EMPTY_DRAFT;
    setView(EMPTY_DRAFT);
    setComposerKey((k) => k + 1);
    await saveNow();
  }

  async function addPhotos(picked: File[]) {
    const files = picked.slice(0, MAX_PHOTOS_PER_PICK);
    if (!files.length) return;
    setBusy(true);
    setError(null);
    const ids: string[] = [];
    for (const file of files) {
      try {
        ids.push(await uploadImage(file));
      } catch {
        // Counted below, with one message for all of them.
      }
    }
    setBusy(false);
    if (ids.length < files.length) setError("A photo couldn’t be read here. Try a JPEG or PNG.");
    if (ids.length) setPhotoIds([...latest.current.photoIds, ...ids]);
  }

  async function removePhoto(id: string) {
    if (!(await ask("Remove this photo from the note?"))) return;
    setPhotoIds(latest.current.photoIds.filter((x) => x !== id));
    if (!originals.includes(id)) deleteMedia(id).catch(() => {});
  }

  async function discard() {
    const d = latest.current;
    const hasContent = !richIsEmpty(d.html) || d.photoIds.length > 0;
    if (hasContent && !(await ask(d.editId ? "Throw away your changes to this saved note?" : "Throw away this note?", "Throw away"))) return;
    dropFreshPhotos(d);
    await resetComposer();
  }

  async function saveNote() {
    const d = latest.current;
    if (richIsEmpty(d.html) && d.photoIds.length === 0) {
      setError("Write something or add a photo first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (d.editId) {
        await updateNote(d.editId, d.html, d.photoIds);
        for (const id of originals.filter((x) => !d.photoIds.includes(x))) deleteMedia(id).catch(() => {});
      } else {
        await createNote(goal, d.html, d.photoIds);
      }
      await resetComposer();
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function editNote(n: Note) {
    const d = latest.current;
    const hasContent = !richIsEmpty(d.html) || d.photoIds.length > 0;
    if (d.editId !== n.id && hasContent && !(await ask("Replace the note you are writing? Photos added to it are deleted from your account.", "Replace"))) return;
    setOpenId(null);
    if (d.editId !== n.id) {
      dropFreshPhotos(d);
      latest.current = { html: n.html, photoIds: [...n.photos], editId: n.id };
      setView(latest.current);
      setComposerKey((k) => k + 1);
      await saveNow();
    }
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function togglePin(n: Note) {
    try {
      await setPinned(n.id, !n.pinned);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function removeNote(n: Note) {
    if (!(await ask("Delete this saved note for good? Its photos are deleted from your account."))) return;
    setOpenId(null);
    try {
      if (editId === n.id) {
        dropFreshPhotos(latest.current);
        await resetComposer();
      }
      await deleteNote(n.id);
      for (const id of n.photos) deleteMedia(id).catch(() => {});
      await refresh();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <section ref={sectionRef} id={`goal-notes-${goal}`} className="card scroll-mt-6">
      <div className="card-head">
        <div>
          <div className="eyebrow">{editId ? "Editing a saved note" : "Thinking"}</div>
          <h2>Notes</h2>
        </div>
      </div>
      <ErrorNote error={error} />

      {view === null ? (
        <p className="empty">Loading…</p>
      ) : (
        <div className="goal-composer">
          <MiniEditor key={composerKey} html={view.html} label={`Notes for ${name}`} placeholder={PLACEHOLDER} onChange={onHtml} />
          <div className="row-inline" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <label className="wbtn soft small photo-add">
              + Add photo
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void addPhotos(files);
                }}
              />
            </label>
            <span className="small muted">Photos are saved to your account.</span>
          </div>
          {view.photoIds.length > 0 && (
            <div className="photo-grid">
              {view.photoIds.map((id) => (
                <figure key={id} className="photo">
                  {urls[id] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[id]} alt="Photo for this note" loading="lazy" />
                  )}
                  <figcaption>
                    <button type="button" className="wbtn ghost small" onClick={() => removePhoto(id)}>Remove photo</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="button" className="wbtn ghost small" onClick={discard} disabled={busy}>{editId ? "Cancel edit" : "Clear"}</button>
            <button type="button" className="wbtn primary small" onClick={saveNote} disabled={busy}>
              {busy ? "Saving…" : editId ? "Update note" : "Save note"}
            </button>
          </div>
        </div>
      )}

      {notes !== null &&
        (all.length === 0 ? (
          <div className="empty">
            No saved notes yet. Write a thought above and save it. It lands here as a page.
          </div>
        ) : (
          <>
            {pinned.length > 0 && <div className="scrap-sub">Pinned</div>}
            {pinned.length > 0 && <ScrapBook rows={pinned} offset={0} urls={urls} onOpen={setOpenId} onPin={togglePin} />}
            {rest.length > 0 && pinned.length > 0 && <div className="scrap-sub">Recent</div>}
            {rest.length > 0 && <ScrapBook rows={rest} offset={pinned.length} urls={urls} onOpen={setOpenId} onPin={togglePin} />}
          </>
        ))}

      {openNote && (
        <NoteDialog
          note={openNote}
          urls={urls}
          onClose={() => setOpenId(null)}
          onPin={() => togglePin(openNote)}
          onEdit={() => editNote(openNote)}
          onDelete={() => removeNote(openNote)}
        />
      )}
      {dialog}
    </section>
  );
}

function ScrapBook({
  rows,
  offset,
  urls,
  onOpen,
  onPin,
}: {
  rows: Note[];
  offset: number;
  urls: Record<string, string>;
  onOpen: (id: string) => void;
  onPin: (n: Note) => void;
}) {
  return (
    <div className="scrapbook">
      {rows.map((n, i) => (
        <ScrapCard key={n.id} note={n} index={i + offset} urls={urls} onOpen={onOpen} onPin={onPin} />
      ))}
    </div>
  );
}

function ScrapCard({
  note,
  index,
  urls,
  onOpen,
  onPin,
}: {
  note: Note;
  index: number;
  urls: Record<string, string>;
  onOpen: (id: string) => void;
  onPin: (n: Note) => void;
}) {
  const date = fmtDay(ymd(note.created_at), { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const snippet = plainOf(note.html).slice(0, 140);
  const cover = note.photos[0];
  const more = note.photos.length - 1;
  return (
    <article className={`scrap tone-${TONES[index % 3]} tilt-${index % 4}${note.pinned ? " is-pinned" : ""}`}>
      <button type="button" className="scrap-open" onClick={() => onOpen(note.id)} aria-label={`Open note from ${date}`}>
        {cover && (
          <span className="scrap-photo">
            {urls[cover] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[cover]} alt="Photo from this note" loading="lazy" />
            )}
            {more > 0 && <span className="scrap-count">+{more}</span>}
          </span>
        )}
        <span className="scrap-date">{date}</span>
        <span className="scrap-note">{snippet || "Photo note"}</span>
        <span className="scrap-link">Open</span>
      </button>
      <button
        type="button"
        className="scrap-pin"
        onClick={() => onPin(note)}
        aria-pressed={note.pinned}
        aria-label={`${note.pinned ? "Unpin" : "Pin"} note from ${date}`}
        title={note.pinned ? "Unpin" : "Pin to the top"}
      >
        <PinIcon />
      </button>
    </article>
  );
}
