"use client";

import { useState } from "react";
import { MoodExplain } from "./MoodExplain";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { addMoodPhoto, removeMoodPhoto, setMood } from "@/lib/willow/actions";
import { MOODS, MOOD_NOTES } from "@/lib/willow/constants";
import { explainHtml, withDay, type MoodPage } from "@/lib/willow/mood";
import type { DayMood, MoodPhoto } from "@/lib/willow/types";
import { usePhotoUrls } from "@/lib/usePhotoUrls";

const MAX_PER_PICK = 6;

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The mood for the picked day: the mood buttons, what is behind it (autosaved), and photos. */
export function MoodDayCard({
  day,
  today,
  row,
  photos,
  edit,
  reload,
}: {
  day: string;
  today: string;
  row?: DayMood;
  photos: MoodPhoto[];
  edit: (fn: (p: MoodPage) => MoodPage) => void;
  reload: () => void;
}) {
  const cur = row?.mood ?? null;
  const urls = usePhotoUrls(photos.map((p) => p.media_id));
  const { ask, dialog } = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (key: string) => {
    edit((p) => ({ ...p, moods: withDay(p.moods, day, { mood: key }) }));
    setMood(day, key).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };

  const addPhotos = async (files: File[]) => {
    const picked = files.slice(0, MAX_PER_PICK);
    if (!picked.length) return;
    setBusy(true);
    setErr(null);
    let position = photos.length;
    for (const file of picked) {
      try {
        const mediaId = await addMoodPhoto(day, file, position);
        const photo: MoodPhoto = { day, media_id: mediaId, position };
        edit((p) => ({ ...p, photos: [...p.photos, photo] }));
        position += 1;
      } catch (e) {
        setErr(`A photo couldn’t be saved. ${errorText(e)}`);
      }
    }
    setBusy(false);
  };

  const removePhoto = async (mediaId: string) => {
    if (!(await ask("Remove this photo from this day? It is deleted from your account.", "Remove"))) return;
    edit((p) => ({ ...p, photos: p.photos.filter((x) => !(x.day === day && x.media_id === mediaId)) }));
    removeMoodPhoto(day, mediaId).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };

  const eyebrow = day === today ? "Today" : fmtDay(day, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <Card id="mood-card" eyebrow={eyebrow} title="Mood and why">
      <ErrorNote error={err} />
      <div className="moods" role="group" aria-label="Choose a mood">
        {MOODS.map((m) => (
          <button key={m.key} type="button" className="mood-btn" aria-pressed={cur === m.key} onClick={() => pick(m.key)}>
            <span className="e">
              <Icon body={m.icon} className="mi" />
            </span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      {cur && MOOD_NOTES[cur] && <p className="small" style={{ marginTop: 10 }}>{MOOD_NOTES[cur]}</p>}

      <div style={{ marginTop: 14 }}>
        <MoodExplain
          day={day}
          html={explainHtml(row)}
          onSaved={(h) => edit((p) => ({ ...p, moods: withDay(p.moods, day, { html: h }) }))}
          onError={setErr}
        />
      </div>

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
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure key={p.media_id} className="photo">
              {urls[p.media_id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.media_id]} alt={`Photo from ${fmtDay(day, { month: "short", day: "numeric" })}`} loading="lazy" />
              )}
              <figcaption>
                <button type="button" className="wbtn ghost small" onClick={() => void removePhoto(p.media_id)}>
                  Remove photo
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        Never assumed. Nothing here decides what your mood means. You interpret your own patterns.
      </p>
      {dialog}
    </Card>
  );
}

