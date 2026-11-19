"use client";

import type { ReactNode } from "react";
import { PinIcon } from "@/components/notes/PinIcon";
import { Icon } from "@/components/ui/Icon";
import { SCRAP_TONES } from "@/lib/journal";
import { MOODS } from "@/lib/willow/constants";

export type MoodDef = (typeof MOODS)[number];

/** One scrapbook page: a photo (or the mood icon alone), the date, the mood, a snippet and a pin. Mood and History both use it. */
export function ScrapPage({
  date,
  index,
  pinned,
  mood,
  photoUrl,
  photoCount,
  snippet,
  history,
  onOpen,
  onPin,
}: {
  date: string;
  index: number;
  pinned: boolean;
  mood: MoodDef | null;
  photoUrl?: string;
  photoCount: number;
  snippet: string;
  /** History pages show the day's colour swatch, and the count when there is no mood. */
  history?: { level: number; count: number };
  onOpen: () => void;
  onPin: () => void;
}) {
  const moodTag = mood ? (
    <span className="scrap-mood">
      <Icon body={mood.icon} className="mi" />
      <span>{mood.label}</span>
    </span>
  ) : null;
  return (
    <article className={`scrap tone-${SCRAP_TONES[index % 3]} tilt-${index % 4}${pinned ? " is-pinned" : ""}${history ? " hist" : ""}`}>
      <button type="button" className="scrap-open" onClick={onOpen} aria-label={`Open ${date}`}>
        {photoCount > 0 ? (
          <span className="scrap-photo">
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={`Photo from ${date}`} loading="lazy" />
            )}
            {photoCount > 1 && <span className="scrap-count">+{photoCount - 1}</span>}
          </span>
        ) : mood ? (
          <span className="scrap-sticker" aria-hidden="true">
            <Icon body={mood.icon} className="mi" />
          </span>
        ) : null}
        <span className="scrap-date">{date}</span>
        {history ? (
          <span className="hist-row">
            <span className={`hist-swatch l${history.level}`} aria-hidden="true" />
            {moodTag ?? <span className="small muted">{history.count} logged</span>}
          </span>
        ) : (
          moodTag
        )}
        {snippet && <span className="scrap-note">{snippet}</span>}
        <span className="scrap-link">Open</span>
      </button>
      <button
        type="button"
        className="scrap-pin"
        aria-pressed={pinned}
        aria-label={`${pinned ? "Unpin" : "Pin"} ${date}`}
        title={pinned ? "Unpin" : "Pin to the top"}
        onClick={onPin}
      >
        <PinIcon />
      </button>
    </article>
  );
}

/** Pinned pages, then recent pages, with the "show older" control. Each page gets its tone and tilt from its position. */
export function ScrapBook({
  pinned,
  shown,
  older,
  showAll,
  onMore,
  render,
  empty,
}: {
  pinned: string[];
  shown: string[];
  older: number;
  showAll: boolean;
  onMore: () => void;
  render: (day: string, index: number) => ReactNode;
  empty: ReactNode;
}) {
  if (!pinned.length && !shown.length) return <>{empty}</>;
  return (
    <>
      {pinned.length > 0 && (
        <>
          <div className="scrap-sub">Pinned</div>
          <div className="scrapbook">{pinned.map((d, i) => render(d, i))}</div>
        </>
      )}
      {shown.length > 0 && (
        <>
          {pinned.length > 0 && <div className="scrap-sub">Recent</div>}
          <div className="scrapbook">{shown.map((d, i) => render(d, i + pinned.length))}</div>
        </>
      )}
      {(older > 0 || showAll) && (
        <div className="row-inline" style={{ justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="wbtn soft small" onClick={onMore}>
            {showAll ? "Show fewer" : `Show ${older} older day${older === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </>
  );
}
