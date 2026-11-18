"use client";

import { useEffect, useRef, useState } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { CATS, ME_TIME, MOODS, MOOD_NOTES } from "@/lib/willow/constants";
import { addMoodPhoto, removeMoodPhoto, setMeTime, setMood, saveMoodHtml } from "@/lib/willow/actions";
import type { DayMood, MoodPhoto } from "@/lib/willow/types";
import type { HomeCtx } from "./context";

const MAX_PHOTOS_PER_PICK = 6;
const SAVE_MS = 800;

/** Upserts one day in a list of day rows, the same way the database does. */
const withDay = (list: DayMood[], day: string, patch: Partial<DayMood>): DayMood[] => {
  if (!list.some((m) => m.day === day)) return [...list, { day, mood: null, note: "", html: "", ...patch }];
  return list.map((m) => (m.day === day ? { ...m, ...patch } : m));
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

export function MoodCard({ ctx }: { ctx: HomeCtx }) {
  const { data, edit, reload } = ctx;
  const today = data.today;
  const row = data.moods.find((m) => m.day === today) ?? null;
  const mood = row?.mood ?? null;
  const photos: MoodPhoto[] = data.moodPhotos.filter((p) => p.day === today).sort((a, b) => a.position - b.position);
  const urls = usePhotoUrls(photos.map((p) => p.media_id));
  const { ask, dialog } = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The explanation autosaves. The last change is written when the card closes.
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const html = pending.current;
    pending.current = null;
    if (html !== null) saveMoodHtml(today, html).catch((e) => setErr(errorText(e)));
  };
  useEffect(() => () => flush(), [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const onHtml = (html: string) => {
    pending.current = html;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_MS);
  };

  const pick = (key: string) => {
    edit((d) => ({ ...d, moods: withDay(d.moods, today, { mood: key }) }));
    setMood(today, key).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };

  const addPhotos = async (files: File[]) => {
    const picked = files.slice(0, MAX_PHOTOS_PER_PICK);
    if (!picked.length) return;
    setBusy(true);
    setErr(null);
    let next = photos.length;
    for (const file of picked) {
      try {
        const mediaId = await addMoodPhoto(today, file, next);
        edit((d) => ({ ...d, moodPhotos: [...d.moodPhotos, { day: today, media_id: mediaId, position: next }] }));
        next += 1;
      } catch (e) {
        setErr(`A photo couldn’t be saved. ${errorText(e)}`);
      }
    }
    setBusy(false);
  };

  const removePhoto = async (mediaId: string) => {
    if (!(await ask("Remove this photo from this day? It is deleted from your account."))) return;
    edit((d) => ({ ...d, moodPhotos: d.moodPhotos.filter((p) => p.media_id !== mediaId) }));
    removeMoodPhoto(today, mediaId).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };

  const ticked = (key: string) => data.activities.some((a) => a.day === today && a.me_key === key);
  const tickedCount = ME_TIME.filter((m) => ticked(m.key)).length;

  const toggleMe = (key: string) => {
    const item = ME_TIME.find((m) => m.key === key);
    if (!item) return;
    const on = ticked(key);
    edit((d) => ({
      ...d,
      activities: on
        ? d.activities.filter((a) => !(a.day === today && a.me_key === key))
        : [
            ...d.activities,
            {
              id: `pending-${key}`, day: today, category: item.category, goal_id: null, title: item.label, minutes: 0,
              offline: !!CATS[item.category]?.offline, note: "", checklist: false, me_key: key,
            },
          ],
    }));
    setMeTime(today, key, !on).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };

  const note = mood ? MOOD_NOTES[mood] : undefined;

  return (
    <Card id="mood-card" eyebrow="Today" title="How are you feeling?">
      <ErrorNote error={err} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Choose a mood">
        {MOODS.map((m) => {
          const on = mood === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => pick(m.key)}
              className={`flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                on
                  ? "border-2 border-dashed border-[var(--sage-deep)] bg-[rgba(110,156,126,0.2)] font-semibold"
                  : "border-[rgba(63,107,80,0.35)] bg-[rgba(110,156,126,0.12)] hover:bg-[rgba(110,156,126,0.2)]"
              }`}
            >
              <Icon body={m.icon} className="h-5 w-5 shrink-0" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      {note && <p className="mt-3 text-sm">{note}</p>}

      <div className="mt-4">
        <MiniEditor
          key={today}
          html={row?.html ?? ""}
          label="What is behind this mood?"
          placeholder="What is behind it? Write as much or as little as you like."
          onChange={onHtml}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="btn btn-sm cursor-pointer">
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
        <span className="text-xs text-muted">Photos are saved to your account.</span>
      </div>
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure key={p.media_id} className="photo">
              {urls[p.media_id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.media_id]} alt="Photo from this day" loading="lazy" />
              )}
              <figcaption>
                <button type="button" className="btn btn-sm" onClick={() => removePhoto(p.media_id)}>Remove photo</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-dashed border-[rgba(63,107,80,0.35)] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted">Me time</p>
          <p className="text-sm text-muted">{tickedCount} of {ME_TIME.length}</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Me time for today">
          {ME_TIME.map((m) => {
            const on = ticked(m.key);
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleMe(m.key)}
                className={`flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm ${
                  on ? "border-[var(--sage-deep)] bg-[rgba(110,156,126,0.22)] font-semibold" : "border-[rgba(63,107,80,0.3)] bg-[rgba(110,156,126,0.08)]"
                }`}
              >
                <Icon body={m.icon} className="h-5 w-5 shrink-0 text-[var(--rose)]" />
                <span className="min-w-0 flex-1">{m.label}</span>
                <span aria-hidden className={on ? "font-bold text-[var(--rose)]" : "opacity-0"}>✓</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">
        Never assumed. Nothing here decides what your mood means. You interpret your own patterns.
      </p>
      {dialog}
    </Card>
  );
}
