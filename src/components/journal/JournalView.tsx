"use client";

import { useEffect, useMemo, useState } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { PinIcon } from "@/components/notes/PinIcon";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay, todayYMD } from "@/lib/dates";
import { htmlFromBody, JOURNAL_TYPES, SCRAP_TONES, typeLabel } from "@/lib/journal";
import { plainOf } from "@/lib/notes";
import { deleteJournalEntry, setJournalFavorite } from "@/lib/willow/actions";
import { loadJournal } from "@/lib/willow/data";
import type { JournalEntry } from "@/lib/willow/types";
import { EntryDialog } from "./EntryDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The diary: every entry, search, filters by type, tag and favourite, and a scrapbook or list view. */
export function JournalView() {
  const [rows, setRows] = useState<JournalEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [tag, setTag] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [scrap, setScrap] = useState(true);
  const [editing, setEditing] = useState<JournalEntry | "new" | null>(null);
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    let live = true;
    loadJournal()
      .then((r) => {
        if (live) {
          setRows(r);
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

  const allTags = useMemo(() => [...new Set((rows ?? []).flatMap((j) => j.tags))].sort(), [rows]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (j) =>
        (type === "all" || j.type === type) &&
        (!tag || j.tags.includes(tag)) &&
        (!favOnly || j.favorite) &&
        (!needle || `${j.title} ${j.body}`.toLowerCase().includes(needle)),
    );
  }, [rows, q, type, tag, favOnly]);

  const reset = () => {
    setQ("");
    setType("all");
    setTag("");
    setFavOnly(false);
  };

  function toggleFav(j: JournalEntry) {
    const on = !j.favorite;
    setRows((rs) => rs?.map((x) => (x.id === j.id ? { ...x, favorite: on } : x)) ?? rs);
    setJournalFavorite(j.id, on).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  async function remove(j: JournalEntry) {
    if (!(await ask("Delete this journal entry for good?"))) return;
    setRows((rs) => rs?.filter((x) => x.id !== j.id) ?? rs);
    deleteJournalEntry(j.id).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  }

  const tagButton = (x: string, muted: boolean) => (
    <button
      key={x}
      type="button"
      className={`tag${muted ? " muted" : ""}`}
      aria-pressed={tag === x}
      onClick={() => setTag(tag === x ? "" : x)}
    >
      #{x}
    </button>
  );

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Your diary</div>
          <h1>Journal</h1>
        </div>
        <button type="button" className="wbtn primary small" onClick={() => setEditing("new")}>
          + New entry
        </button>
      </div>

      <form className="card" style={{ padding: 14 }} onSubmit={(e) => e.preventDefault()}>
        <div className="row-inline">
          <input className="winput" value={q} placeholder="Search your entries" aria-label="Search entries" onChange={(e) => setQ(e.target.value)} />
          <select
            className="winput"
            style={{ flex: "0 1 180px" }}
            value={type}
            aria-label="Entry type"
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All types</option>
            {JOURNAL_TYPES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <label className="row-inline" style={{ gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> Favorites
          </label>
          <button type="button" className="wbtn ghost small" onClick={reset}>
            Reset
          </button>
        </div>
      </form>

      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div className="row-inline">{allTags.map((x) => tagButton(x, tag !== x))}</div>
        <button type="button" className="wbtn soft small" onClick={() => setScrap((s) => !s)}>
          {scrap ? "List view" : "Scrapbook view"}
        </button>
      </div>

      <ErrorNote error={err} />

      {rows === null && !err && <p className="empty">Opening your journal…</p>}

      {rows !== null && list.length === 0 && (
        <div className="empty">No entries match. Start with a small thought. It doesn’t need to be long.</div>
      )}

      {list.length > 0 && scrap && (
        <div className="scrapbook journal-book">
          {list.map((j, i) => {
            const snip = (j.html ? plainOf(j.html) : j.body).slice(0, 220);
            return (
              <article
                key={j.id}
                className={`scrap tone-${SCRAP_TONES[i % 3]} tilt-${i % 4}${j.favorite ? " is-pinned" : ""}`}
              >
                <div className="scrap-open scrap-entry">
                  <span className="scrap-date">{fmtDay(j.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="scrap-mood">
                    <span>{typeLabel(j.type)}</span>
                  </span>
                  <h3 className="scrap-title">{j.title || fmtDay(j.day)}</h3>
                  {snip && <span className="scrap-note">{snip}</span>}
                  {j.tags.length > 0 && <span className="scrap-tags">{j.tags.map((x) => tagButton(x, true))}</span>}
                  <span className="scrap-foot">
                    <button type="button" className="wbtn ghost small" onClick={() => setEditing(j)}>
                      Edit
                    </button>
                    <button type="button" className="wbtn danger small" onClick={() => remove(j)}>
                      Delete
                    </button>
                  </span>
                </div>
                <button
                  type="button"
                  className="scrap-pin"
                  aria-pressed={j.favorite}
                  aria-label={j.favorite ? "Unfavorite" : "Favorite"}
                  title={j.favorite ? "Unfavorite" : "Favorite"}
                  onClick={() => toggleFav(j)}
                >
                  <PinIcon />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {list.length > 0 && !scrap && (
        <div className="grid">
          {list.map((j, i) => (
            <article
              key={j.id}
              className="card reveal"
              style={{ background: ["var(--pink-soft)", "var(--butter)", "var(--surface-2)"][i % 3], boxShadow: "none" }}
            >
              <div className="row-inline" style={{ justifyContent: "space-between" }}>
                <span className="tag">{typeLabel(j.type)}</span>
                <button
                  type="button"
                  className="wbtn ghost small"
                  aria-pressed={j.favorite}
                  aria-label="Favorite"
                  onClick={() => toggleFav(j)}
                >
                  {j.favorite ? "★" : "☆"}
                </button>
              </div>
              <h3 style={{ margin: "10px 0 4px" }}>{j.title || fmtDay(j.day)}</h3>
              <p className="small muted">{fmtDay(j.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
              <div style={{ marginTop: 8, overflowWrap: "anywhere" }}>
                <MiniEditor html={j.html || htmlFromBody(j.body)} label="Journal entry" readOnly />
              </div>
              <div className="row-inline" style={{ marginTop: 10, justifyContent: "space-between" }}>
                <span className="row-inline">{j.tags.map((x) => tagButton(x, true))}</span>
                <span>
                  <button type="button" className="wbtn ghost small" onClick={() => setEditing(j)}>
                    Edit
                  </button>
                  <button type="button" className="wbtn danger small" onClick={() => remove(j)}>
                    Delete
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== null && (
        <EntryDialog
          entry={editing === "new" ? null : editing}
          defaultDay={todayYMD()}
          onSaved={reload}
          onClose={() => setEditing(null)}
        />
      )}
      {dialog}
    </div>
  );
}
