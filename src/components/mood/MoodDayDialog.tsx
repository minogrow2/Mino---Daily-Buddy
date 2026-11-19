"use client";

import { MiniEditor } from "@/components/notes/MiniEditor";
import { Icon } from "@/components/ui/Icon";
import { fmtDay } from "@/lib/dates";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { MOOD_NOTES, moodOf } from "@/lib/willow/constants";
import type { DayMood, MoodPhoto } from "@/lib/willow/types";
import { DayDialog } from "./DayDialog";

/** One day opened from the scrapbook: the mood, what was written, photos, and pin, edit or close. */
export function MoodDayDialog({
  day,
  row,
  photos,
  pinned,
  onPin,
  onEdit,
  onClose,
}: {
  day: string;
  row?: DayMood;
  photos: MoodPhoto[];
  pinned: boolean;
  onPin: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const urls = usePhotoUrls(photos.map((p) => p.media_id));
  const mm = moodOf(row?.mood);
  const date = fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <DayDialog label={`Day ${date}`} onClose={onClose}>
      <div className="scrap-head">
        <div>
          <div className="eyebrow">{date}</div>
          <h2>{mm ? mm.label : "A day to keep"}</h2>
        </div>
        {mm && (
          <span className="scrap-sticker big" aria-hidden="true">
            <Icon body={mm.icon} className="mi" />
          </span>
        )}
      </div>
      {row?.mood && MOOD_NOTES[row.mood] && <p className="small muted">{MOOD_NOTES[row.mood]}</p>}
      {row?.html ? (
        <div className="scrap-text">
          <MiniEditor html={row.html} label="What was written" readOnly checklist />
        </div>
      ) : row?.note ? (
        <p className="scrap-text" style={{ whiteSpace: "pre-wrap" }}>
          {row.note}
        </p>
      ) : (
        <p className="small muted">Nothing written for this day.</p>
      )}
      {photos.length > 0 && (
        <div className="scrap-gallery">
          {photos.map((p) => (
            <figure key={p.media_id} className="photo">
              {urls[p.media_id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.media_id]} alt={`Photo from ${fmtDay(day, { month: "short", day: "numeric" })}`} loading="lazy" />
              )}
            </figure>
          ))}
        </div>
      )}
      <div className="actions scrap-actions">
        <button type="button" className="wbtn soft small" aria-pressed={pinned} onClick={onPin}>
          {pinned ? "Unpin from scrapbook" : "Pin to scrapbook"}
        </button>
        <button type="button" className="wbtn ghost small" onClick={onEdit}>
          Edit this day
        </button>
        <button type="button" className="wbtn primary small" onClick={onClose}>
          Close
        </button>
      </div>
    </DayDialog>
  );
}
