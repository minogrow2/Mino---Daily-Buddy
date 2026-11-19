"use client";

import { useEffect, useState } from "react";
import "@/app/willow-savings.css";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { php } from "@/lib/willow/savings";
import {
  LIB_STATUS,
  loadLibrary,
  loadWishlist,
  safeHref,
  type LibraryItem,
  type LibraryKind,
  type WishItem,
} from "@/lib/willow/library";
import {
  deleteLibraryItem,
  deleteWishlistItem,
  setWishlistBought,
  updateLibraryItem,
  type LibraryFields,
} from "@/lib/willow/library-actions";
import { LibraryItemDialog, WishlistDialog } from "./LibraryDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

type Tab = "content" | "knowledge" | "wishlist";
const TABS: [Tab, string][] = [
  ["content", "Watch and read"],
  ["knowledge", "Knowledge"],
  ["wishlist", "Wishlist"],
];

/** The personal library: watch-and-read items, knowledge notes and the wishlist, with search across all three. */
export function LibraryView() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [wish, setWish] = useState<WishItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("content");
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ kind: LibraryKind; item: LibraryItem | null } | null>(null);
  const [wishOpen, setWishOpen] = useState(false);
  const { ask, dialog: confirm } = useConfirm();

  useEffect(() => {
    let live = true;
    Promise.all([loadLibrary(), loadWishlist()])
      .then(([library, wishlist]) => {
        if (live) {
          setItems(library);
          setWish(wishlist);
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  const reload = () => setTick((t) => t + 1);

  /** Shows the change at once, saves it, and reloads the page's copy if the save fails. */
  function patchItem(id: string, patch: LibraryFields) {
    setItems((rs) => rs?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? rs);
    updateLibraryItem(id, patch).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  async function removeItem(id: string, message: string) {
    if (!(await ask(message, "Remove"))) return;
    setItems((rs) => rs?.filter((x) => x.id !== id) ?? rs);
    deleteLibraryItem(id).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  function toggleBought(w: WishItem) {
    const on = !w.bought;
    setWish((rs) => rs?.map((x) => (x.id === w.id ? { ...x, bought: on } : x)) ?? rs);
    setWishlistBought(w.id, on).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  async function removeWish(w: WishItem) {
    if (!(await ask("Remove this wishlist item?", "Remove"))) return;
    setWish((rs) => rs?.filter((x) => x.id !== w.id) ?? rs);
    deleteWishlistItem(w.id).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  const needle = q.trim().toLowerCase();
  const hit = (s: unknown) => !needle || String(s ?? "").toLowerCase().includes(needle);
  const content = (items ?? []).filter((x) => x.kind === "content" && (hit(x.title) || hit(x.category) || hit(x.note)));
  const knowledge = (items ?? []).filter((x) => x.kind === "knowledge" && (hit(x.title) || hit(x.body) || x.tags.some(hit)));
  const wishItems = (wish ?? []).filter((x) => hit(x.title) || hit(x.kind));
  const doneCount = (items ?? []).filter((x) => x.kind === "content" && x.status === "Completed").length;

  function openAdd() {
    if (tab === "wishlist") setWishOpen(true);
    else setEditing({ kind: tab, item: null });
  }

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Goal 06 and the personal library</div>
          <h1>Library</h1>
        </div>
      </div>

      <form
        className="row-inline lib-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
        }}
      >
        <input
          className="winput"
          value={draft}
          placeholder="Search everything"
          aria-label="Search library"
          onChange={(e) => {
            setDraft(e.target.value);
            if (!e.target.value) setQ("");
          }}
        />
        <button type="submit" className="wbtn small soft">
          Search
        </button>
      </form>

      <div className="row-inline">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`wbtn small ${tab === k ? "primary" : "soft"}`}
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorNote error={err} />
      {(items === null || wish === null) && !err && <p className="empty">Opening your library…</p>}

      {items !== null && wish !== null && tab === "content" && (
        <Card
          title="Watch and read"
          eyebrow={`${doneCount} completed`}
          right={
            <button type="button" className="wbtn small soft" onClick={openAdd}>
              + Save item
            </button>
          }
        >
          {content.length ? (
            <ul className="list">
              {content.map((x) => {
                const done = x.status === "Completed";
                const link = safeHref(x.url);
                return (
                  <li key={x.id} className={`item wrap-row ${done ? "done" : ""}`}>
                    <button
                      type="button"
                      className="check"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`Mark ${x.title} complete`}
                      onClick={() => patchItem(x.id, { status: done ? "In progress" : "Completed" })}
                    >
                      {done ? "✓" : ""}
                    </button>
                    <span className="grow">
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {x.title}
                        </a>
                      ) : (
                        x.title
                      )}
                      <br />
                      {x.category && <span className="tag muted">{x.category}</span>}
                      {x.note && <span className="small muted"> {x.note}</span>}
                    </span>
                    <select
                      className="winput lib-status"
                      value={x.status || "Planned"}
                      aria-label="Status"
                      onChange={(e) => patchItem(x.id, { status: e.target.value })}
                    >
                      {LIB_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="item-actions">
                      <button type="button" className="wbtn soft small" onClick={() => setEditing({ kind: "content", item: x })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="wbtn danger small"
                        onClick={() => removeItem(x.id, "Remove this from your library?")}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty">Save a video, documentary, book or article. Track what you finish, not hours.</div>
          )}
        </Card>
      )}

      {items !== null && wish !== null && tab === "knowledge" && (
        <Card
          title="Personal knowledge"
          eyebrow="Searchable"
          right={
            <button type="button" className="wbtn small soft" onClick={openAdd}>
              + Add
            </button>
          }
        >
          {knowledge.length ? (
            <div className="grid two">
              {knowledge.map((x) => {
                const link = safeHref(x.url);
                return (
                  <article key={x.id} className="card lib-note">
                    <div className="lib-note-head">
                      <span className="tag">{x.type}</span>
                      <div className="item-actions">
                        <button type="button" className="wbtn soft small" onClick={() => setEditing({ kind: "knowledge", item: x })}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="wbtn danger small"
                          onClick={() => removeItem(x.id, "Remove this note from your library?")}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <h3>{x.title}</h3>
                    {x.body && <p className="small lib-body">{x.body.slice(0, 400)}</p>}
                    {link && (
                      <p className="small">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          Open link
                        </a>
                      </p>
                    )}
                    {x.tags.length > 0 && <p className="lib-tags">{x.tags.map((t) => `#${t}`).join(" ")}</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">Notes, links, snippets, ideas and AI tools you want to find again.</div>
          )}
        </Card>
      )}

      {items !== null && wish !== null && tab === "wishlist" && (
        <Card
          title="Wishlist and future plans"
          eyebrow="Future plans"
          right={
            <button type="button" className="wbtn small soft" onClick={openAdd}>
              + Add
            </button>
          }
        >
          {wishItems.length ? (
            <ul className="list">
              {wishItems.map((x) => (
                <li key={x.id} className={`item wrap-row ${x.bought ? "done" : ""}`}>
                  <button
                    type="button"
                    className="check"
                    role="checkbox"
                    aria-checked={x.bought}
                    aria-label={`${x.title} bought`}
                    onClick={() => toggleBought(x)}
                  >
                    {x.bought ? "✓" : ""}
                  </button>
                  <span className="grow">
                    {x.title}
                    <br />
                    <span className="tag muted">{x.kind}</span>
                    {x.price != null && <span className="small muted"> {php(x.price)}</span>}
                    {x.note && <span className="small muted"> {x.note}</span>}
                  </span>
                  <div className="item-actions">
                    <button type="button" className="wbtn danger small" onClick={() => removeWish(x)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Clothes, technology, books, places, skills and experiences you are looking forward to.</div>
          )}
        </Card>
      )}

      {confirm}
      {editing && (
        <LibraryItemDialog
          kind={editing.kind}
          item={editing.item}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {wishOpen && (
        <WishlistDialog
          onSaved={() => {
            setWishOpen(false);
            reload();
          }}
          onClose={() => setWishOpen(false)}
        />
      )}
    </div>
  );
}
