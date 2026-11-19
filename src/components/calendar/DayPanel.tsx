"use client";

import { useEffect, useState } from "react";
import { EntryDialog } from "@/components/journal/EntryDialog";
import { ScreenTimeNote } from "@/components/screen/ScreenTimeNote";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { typeLabel } from "@/lib/journal";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import {
  addMoodPhoto,
  deleteActivity,
  patchTask,
  removeMoodPhoto,
  saveMoodHtml,
  setHabitCheck,
  setMeTime,
  setMood,
} from "@/lib/willow/actions";
import { CATS, ME_TIME, MOODS, MOOD_NOTES } from "@/lib/willow/constants";
import { loadDay, loadDayPhotos } from "@/lib/willow/data";
import { goalName, hm } from "@/lib/willow/logic";
import type { JournalEntry, MoodPhoto } from "@/lib/willow/types";
import { ActivityDialog } from "./ActivityDialog";

type Day = Awaited<ReturnType<typeof loadDay>>;
type DayActivity = Day["activities"][number];
type OpenDialog = { kind: "activity"; row: DayActivity | null } | { kind: "journal"; entry: JournalEntry | null } | null;

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The day page: mood, photos, checklist, me time, tasks, activities and journal for one day. Every tap is saved. */
export function DayPanel({ day, today, onChanged }: { day: string; today: string; onChanged: () => void }) {
  const [data, setData] = useState<Day | null>(null);
  const [photos, setPhotos] = useState<MoodPhoto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { ask, dialog: confirm } = useConfirm();
  const urls = usePhotoUrls(photos.map((p) => p.media_id));

  useEffect(() => {
    let live = true;
    Promise.all([loadDay(day), loadDayPhotos(day)])
      .then(([d, p]) => {
        if (live) {
          setData(d);
          setPhotos(p);
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [day, tick]);

  if (!data) {
    return (
      <Card id="day-panel">
        <ErrorNote error={err} />
        {!err && <p className="empty">Opening the day…</p>}
      </Card>
    );
  }

  const reload = () => setTick((t) => t + 1);
  const fail = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };

  const checked = new Set(data.checkedIds);
  const core = data.habits.filter((h) => h.grp !== "glow");
  const manual = data.activities.filter((a) => !a.me_key);
  const ticked = (key: string) => data.activities.some((a) => a.me_key === key);
  const score = data.activities.length + checked.size + data.journal.length;
  const learnMin = data.activities.filter((a) => CATS[a.category]?.learn).reduce((s, a) => s + a.minutes, 0);
  const goals = [...new Set(data.activities.map((a) => a.goal_id).filter((g): g is string => !!g))].map((g) => goalName(g)).filter(Boolean);
  const stats = [
    `${score} ${score === 1 ? "thing" : "things"} logged`,
    `${core.filter((h) => checked.has(h.id)).length} of ${core.length} habits`,
    learnMin ? `${hm(learnMin)} learning` : "No learning time",
    goals.length ? goals.join(", ") : "No goal work",
  ];

  const mood = data.mood?.mood ?? null;
  const moodNote = mood ? MOOD_NOTES[mood] : undefined;

  const pickMood = (key: string) => {
    setData((d) => d && { ...d, mood: { mood: key, html: d.mood?.html ?? "", note: d.mood?.note ?? "" } });
    setMood(day, key).catch(fail);
  };

  const saveBehind = async (html: string) => {
    await saveMoodHtml(day, html);
    setData((d) => d && { ...d, mood: { mood: d.mood?.mood ?? null, note: d.mood?.note ?? "", html } });
  };

  const toggleHabit = (id: string) => {
    const on = !checked.has(id);
    setData((d) => d && { ...d, checkedIds: on ? [...d.checkedIds, id] : d.checkedIds.filter((x) => x !== id) });
    setHabitCheck(day, id, on).then(onChanged).catch(fail);
  };

  const toggleMe = (key: string) => {
    const item = ME_TIME.find((m) => m.key === key);
    if (!item) return;
    const on = !ticked(key);
    setData(
      (d) =>
        d && {
          ...d,
          activities: on
            ? [
                ...d.activities,
                { id: `pending-${key}`, category: item.category, goal_id: null, title: item.label, minutes: 0, me_key: key, checklist: false },
              ]
            : d.activities.filter((a) => a.me_key !== key),
        },
    );
    setMeTime(day, key, on).then(onChanged).catch(fail);
  };

  const toggleTask = (id: string, done: boolean) => {
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !done } : t)) });
    patchTask(id, { done: !done }).catch(fail);
  };

  const addPhotos = async (files: File[]) => {
    let next = photos.length;
    for (const file of files.slice(0, 6)) {
      try {
        const mediaId = await addMoodPhoto(day, file, next);
        setPhotos((p) => [...p, { day, media_id: mediaId, position: next }]);
        next += 1;
      } catch (e) {
        setErr(`A photo couldn’t be saved. ${errorText(e)}`);
      }
    }
  };

  const removePhoto = async (mediaId: string) => {
    if (!(await ask("Remove this photo from this day? It is deleted from your account.", "Remove"))) return;
    setPhotos((p) => p.filter((x) => x.media_id !== mediaId));
    removeMoodPhoto(day, mediaId).catch(fail);
  };

  const removeActivity = async (a: DayActivity) => {
    if (!(await ask("Delete this activity for good?"))) return;
    setData((d) => d && { ...d, activities: d.activities.filter((x) => x.id !== a.id) });
    deleteActivity(a.id).then(onChanged).catch(fail);
  };

  return (
    <Card id="day-panel" title={fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} eyebrow={day === today ? "Today’s page" : "A past day. Tap anything to change it."}>
      <ErrorNote error={err} />
      <div className="day-page">
        <div className="day-stats">
          {stats.map((s) => (
            <span key={s} className="day-chip">
              {s}
            </span>
          ))}
        </div>
        <div className="day-grid">
          <section className="day-note wide">
            <h3 className="day-note-title">Mood</h3>
            <div className="moods" role="group" aria-label="Mood for this day">
              {MOODS.map((m) => (
                <button key={m.key} type="button" className="mood-btn" aria-pressed={mood === m.key} onClick={() => pickMood(m.key)}>
                  <span className="e">
                    <Icon body={m.icon} className="mi" />
                  </span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {moodNote && (
              <p className="small muted" style={{ marginTop: 8 }}>
                {moodNote}
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              <MoodBehind html={data.mood?.html ?? ""} onSave={saveBehind} />
            </div>
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Photos</h3>
            {photos.length > 0 ? (
              <div className="photo-grid day-photos">
                {photos.map((p) => (
                  <figure key={p.media_id} className="photo">
                    {urls[p.media_id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urls[p.media_id]} alt="Photo from this day" loading="lazy" />
                    )}
                    <figcaption>
                      <button type="button" className="wbtn ghost small" onClick={() => removePhoto(p.media_id)}>
                        Remove
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="small muted">No photo for this day yet.</p>
            )}
            <div className="row-inline" style={{ marginTop: 10 }}>
              <label className="wbtn soft small photo-add">
                + Add photo
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
            </div>
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Daily checklist</h3>
            {core.length > 0 ? (
              <ul className="day-list">
                {core.map((h) => {
                  const on = checked.has(h.id);
                  return (
                    <li key={h.id} className={`day-row${on ? " done" : ""}`}>
                      <button className="check" type="button" role="checkbox" aria-checked={on} aria-label={h.title} onClick={() => toggleHabit(h.id)}>
                        {on ? "✓" : ""}
                      </button>
                      <span className="grow">{h.title}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small muted">No habits yet.</p>
            )}
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Me time</h3>
            <div className="me-grid" role="group" aria-label="Me time for this day">
              {ME_TIME.map((m) => {
                const on = ticked(m.key);
                return (
                  <button key={m.key} type="button" className={`me-chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggleMe(m.key)}>
                    <span className="me-ico">
                      <Icon body={m.icon} className="mi" />
                    </span>
                    <span>{m.label}</span>
                    <span className="me-tick" aria-hidden>
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Tasks</h3>
            {data.tasks.length > 0 ? (
              <ul className="day-list">
                {data.tasks.map((t) => (
                  <li key={t.id} className={`day-row${t.done ? " done" : ""}`}>
                    <button className="check" type="button" role="checkbox" aria-checked={t.done} aria-label={t.title} onClick={() => toggleTask(t.id, t.done)}>
                      {t.done ? "✓" : ""}
                    </button>
                    <span className="grow">{t.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No tasks on this day.</p>
            )}
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Activities</h3>
            {manual.length > 0 ? (
              <ul className="day-list">
                {manual.map((a) => (
                  <li key={a.id} className="day-row">
                    <span className="grow">
                      {a.title}
                      <span className="small muted">
                        {" "}
                        · {CATS[a.category]?.label ?? a.category}
                        {a.minutes ? ` · ${hm(a.minutes)}` : ""}
                      </span>
                    </span>
                    <button type="button" className="wbtn ghost small" onClick={() => setDialog({ kind: "activity", row: a })}>
                      Edit
                    </button>
                    <button type="button" className="wbtn danger small" onClick={() => removeActivity(a)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Nothing logged yet.</p>
            )}
            <div className="row-inline" style={{ marginTop: 6 }}>
              <button type="button" className="wbtn soft small" onClick={() => setDialog({ kind: "activity", row: null })}>
                + Log activity
              </button>
            </div>
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Journal</h3>
            {data.journal.length > 0 ? (
              <ul className="day-list">
                {data.journal.map((j) => (
                  <li key={j.id} className="day-row">
                    <span className="grow">
                      {j.title || "Entry"}
                      <span className="small muted"> · {typeLabel(j.type)}</span>
                    </span>
                    <button type="button" className="wbtn ghost small" onClick={() => setDialog({ kind: "journal", entry: { ...j, day } })}>
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No entry yet.</p>
            )}
            <div className="row-inline" style={{ marginTop: 6 }}>
              <button type="button" className="wbtn soft small" onClick={() => setDialog({ kind: "journal", entry: null })}>
                + Journal
              </button>
            </div>
          </section>

          <section className="day-note">
            <h3 className="day-note-title">Screen time</h3>
            <ScreenTimeNote day={day} />
          </section>
        </div>
      </div>

      {dialog?.kind === "activity" && (
        <ActivityDialog
          day={day}
          row={dialog.row}
          onSaved={() => {
            reload();
            onChanged();
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "journal" && (
        <EntryDialog
          entry={dialog.entry}
          defaultDay={day}
          onSaved={() => {
            reload();
            onChanged();
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {confirm}
    </Card>
  );
}

/** The explanation under a mood. It is saved with the Save button, and only offered once something has changed. */
function MoodBehind({ html, onSave }: { html: string; onSave: (html: string) => Promise<void> }) {
  const [value, setValue] = useState(html);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <MiniEditor html={html} label="What is behind this mood?" placeholder="What is behind it? Write as much or as little as you like." onChange={setValue} />
      {value !== html && (
        <div className="row-inline" style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            className="wbtn primary small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSave(value);
              } catch (e) {
                setErr(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save note"}
          </button>
        </div>
      )}
      <ErrorNote error={err} />
    </>
  );
}
