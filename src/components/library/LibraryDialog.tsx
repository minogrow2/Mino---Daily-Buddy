"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import {
  KNOWLEDGE_TYPES,
  LIB_CATS,
  LIB_STATUS,
  safeHref,
  WISH_KINDS,
  type LibraryItem,
  type LibraryKind,
} from "@/lib/willow/library";
import { addLibraryItem, addWishlistItem, updateLibraryItem, type LibraryFields } from "@/lib/willow/library-actions";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
const within = <T extends string>(list: readonly T[], value: string, fallback: T) =>
  (list as readonly string[]).includes(value) ? (value as T) : fallback;

/** Adds or edits a watch-and-read item (kind "content") or a knowledge note (kind "knowledge"). */
export function LibraryItemDialog({
  kind,
  item,
  onSaved,
  onClose,
}: {
  kind: LibraryKind;
  item: LibraryItem | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isContent = kind === "content";
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<string>(within(LIB_CATS, item?.category ?? "", "Article"));
  const [status, setStatus] = useState<string>(within(LIB_STATUS, item?.status ?? "", "Planned"));
  const [type, setType] = useState<string>(within(KNOWLEDGE_TYPES.map(([v]) => v), item?.type ?? "", "Note"));
  const [body, setBody] = useState(item?.body ?? "");
  const [tags, setTags] = useState(item ? item.tags.join(", ") : "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const heading = isContent
    ? item
      ? "Edit item"
      : "Save something to watch or read"
    : item
      ? "Edit note"
      : "Add to my knowledge library";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const link = url.trim();
    if (!cleanTitle) {
      setErr("Add a title.");
      return;
    }
    if (link && !safeHref(link)) {
      setErr("Use a full link that starts with https://.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const fields: LibraryFields = isContent
        ? { title: cleanTitle, category, status, url: link, note: note.trim() }
        : {
            title: cleanTitle,
            type,
            body: body.trim(),
            url: link,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 12),
          };
      if (item) await updateLibraryItem(item.id, fields);
      else await addLibraryItem(kind, fields);
      onSaved();
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title={heading} eyebrow="Library" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        {isContent ? (
          <>
            <label>
              Title
              <input className="winput" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Category
              <select className="winput" value={category} onChange={(e) => setCategory(e.target.value)}>
                {LIB_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select className="winput" value={status} onChange={(e) => setStatus(e.target.value)}>
                {LIB_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Link <span className="small muted">optional</span>
              <input className="winput" type="url" placeholder="https://" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label>
              Notes <span className="small muted">optional</span>
              <textarea className="winput" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </>
        ) : (
          <>
            <label>
              Kind
              <select className="winput" value={type} onChange={(e) => setType(e.target.value)}>
                {KNOWLEDGE_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input className="winput" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Content <span className="small muted">optional</span>
              <textarea className="winput" rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <label>
              Link <span className="small muted">optional</span>
              <input className="winput" type="url" placeholder="https://" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label>
              Tags <span className="small muted">comma separated</span>
              <input className="winput" maxLength={200} value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
          </>
        )}
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

/** Adds an item to the wishlist. */
export function WishlistDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>(WISH_KINDS[0]);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const value = price.trim() === "" ? null : Math.round(Number(price));
    if (!cleanTitle) {
      setErr("Add the item's name.");
      return;
    }
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setErr("Price must be 0 or more.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await addWishlistItem({ title: cleanTitle, kind, price: value, note: note.trim(), bought: false });
      onSaved();
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title="Add to wishlist" eyebrow="Future plans" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Item
          <input className="winput" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Kind
          <select className="winput" value={kind} onChange={(e) => setKind(e.target.value)}>
            {WISH_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price (PHP) <span className="small muted">optional</span>
          <input className="winput" type="number" inputMode="numeric" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          Note <span className="small muted">optional</span>
          <input className="winput" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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
