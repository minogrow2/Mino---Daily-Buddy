"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrapBook, ScrapPage } from "@/components/mood/ScrapPage";
import { ErrorNote } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { moodOf } from "@/lib/willow/constants";
import { buildMaps, loadHistoryIndex, type HistoryIndex } from "@/lib/willow/history";
import { level } from "@/lib/willow/logic";
import { splitPages } from "@/lib/willow/mood";
import { setDayPin } from "@/lib/willow/mood-actions";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { HistoryDayDialog } from "./HistoryDayDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
const NO_PINS = new Set<string>();

/** History: every logged day as a short page, a search above them, and Open for what got done that day. Pins are shared with the Mood scrapbook. */
export function HistoryView() {
  const [index, setIndex] = useState<HistoryIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadHistoryIndex()
      .then((ix) => {
        if (live) {
          setIndex(ix);
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

  const maps = useMemo(() => (index ? buildMaps(index) : null), [index]);
  const needle = q.trim().toLowerCase();
  const all = maps?.days ?? [];
  const days = useMemo(
    () => (maps && needle ? maps.days.filter((d) => maps.search.get(d)?.includes(needle)) : (maps?.days ?? [])),
    [maps, needle],
  );
  const parts = useMemo(() => splitPages(days, maps?.pins ?? NO_PINS, showAll), [days, maps, showAll]);
  const firstIds = [...parts.pinned, ...parts.shown]
    .map((d) => maps?.photosBy.get(d)?.[0]?.media_id)
    .filter((x): x is string => !!x);
  const urls = usePhotoUrls(firstIds);

  if (!maps) {
    return (
      <div className="grid">
        <div>
          <div className="eyebrow">History</div>
          <h1>History</h1>
        </div>
        <ErrorNote error={err} />
        {!err && <p className="empty">Opening your history…</p>}
      </div>
    );
  }

  const togglePin = (d: string) => {
    const on = !maps.pins.has(d);
    setIndex((ix) => (ix ? { ...ix, pins: on ? [...ix.pins, d] : ix.pins.filter((x) => x !== d) } : ix));
    setDayPin(d, on).catch((e) => {
      setErr(errorText(e));
      setTick((t) => t + 1);
    });
  };

  const count = q ? `${days.length} of ${all.length} days` : `${all.length} logged ${all.length === 1 ? "day" : "days"}`;

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">{count}</div>
        <h1>History</h1>
      </div>
      <ErrorNote error={err} />
      <form
        className="card"
        style={{ padding: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
          setShowAll(false);
        }}
      >
        <div className="row-inline">
          <input
            className="winput"
            name="q"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search your logged days"
            aria-label="Search logged days"
          />
          <button type="submit" className="wbtn soft small">
            Search
          </button>
          <button
            type="button"
            className="wbtn ghost small"
            onClick={() => {
              setDraft("");
              setQ("");
              setShowAll(false);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      <ScrapBook
        pinned={parts.pinned}
        shown={parts.shown}
        older={parts.older}
        showAll={showAll}
        onMore={() => setShowAll((s) => !s)}
        empty={
          <div className="empty">
            {all.length
              ? "No logged day matches that search. Try a word from a note, a journal entry or an activity."
              : "Nothing logged yet. Each day you log shows up here as a page."}
          </div>
        }
        render={(d, i) => {
          const photos = maps.photosBy.get(d) ?? [];
          const score = maps.score.get(d) ?? 0;
          return (
            <ScrapPage
              key={d}
              date={fmtDay(d, { weekday: "short", month: "short", day: "numeric" })}
              index={i}
              pinned={maps.pins.has(d)}
              mood={moodOf(maps.moodBy.get(d)?.mood)}
              photoUrl={photos[0] ? urls[photos[0].media_id] : undefined}
              photoCount={photos.length}
              snippet={maps.snippet.get(d) ?? ""}
              history={{ level: level(score), count: score }}
              onOpen={() => setOpen(d)}
              onPin={() => togglePin(d)}
            />
          );
        }}
      />

      {open && (
        <HistoryDayDialog day={open} pinned={maps.pins.has(open)} onPin={() => togglePin(open)} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
