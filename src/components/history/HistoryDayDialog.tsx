"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DayDialog } from "@/components/mood/DayDialog";
import { Icon } from "@/components/ui/Icon";
import { ErrorNote } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { plainOf } from "@/lib/notes";
import { CATS, goalById, ME_TIME, MOOD_NOTES, moodOf } from "@/lib/willow/constants";
import { loadHistoryDay } from "@/lib/willow/history";
import { hm, level } from "@/lib/willow/logic";
import { usePhotoUrls } from "@/lib/usePhotoUrls";

type Loaded = Awaited<ReturnType<typeof loadHistoryDay>>;
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The concise review of one day: what got done, not the full page. */
export function HistoryDayDialog({ day, pinned, onPin, onClose }: { day: string; pinned: boolean; onPin: () => void; onClose: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadHistoryDay(day)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [day]);
  const urls = usePhotoUrls(data?.photos.map((p) => p.media_id) ?? []);
  const date = fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (!data) {
    return (
      <DayDialog label={`Day ${date}`} onClose={onClose}>
        <ErrorNote error={err} />
        {!err && <p className="small muted">Opening this day…</p>}
        <div className="actions scrap-actions">
          <button type="button" className="wbtn primary small" onClick={onClose}>
            Close
          </button>
        </div>
      </DayDialog>
    );
  }

  const { detail, photos, screenMinutes } = data;
  const mood = detail.mood;
  const mm = moodOf(mood?.mood);
  const acts = detail.activities;
  const checks = new Set(detail.checkedIds);
  const coreHabits = detail.habits.filter((h) => h.grp !== "glow");
  const doneCore = coreHabits.filter((h) => checks.has(h.id));
  const checkedAll = detail.habits.filter((h) => checks.has(h.id)).length;
  const score = acts.length + checkedAll + detail.journal.length;
  const meDone = ME_TIME.filter((x) => acts.some((a) => a.me_key === x.key));
  const manual = acts.filter((a) => !a.me_key);
  const tasksDone = detail.tasks.filter((t) => t.done);
  const goals = [...new Set(acts.map((a) => a.goal_id).filter((g): g is string => !!g))]
    .map((g) => goalById(g))
    .filter((g): g is NonNullable<typeof g> => !!g);
  const learn = acts.filter((a) => CATS[a.category]?.learn).reduce((s, a) => s + a.minutes, 0);
  const stats = [learn ? `${hm(learn)} learning` : "", screenMinutes != null ? `${hm(screenMinutes)} screen` : ""].filter(Boolean);
  const written: { title: string; text: string }[] = detail.journal.flatMap((j) => {
    const t = j.html ? plainOf(j.html) : (j.body ?? "").trim();
    return t ? [{ title: j.title || "Entry", text: t.slice(0, 220) }] : [];
  });
  const moodText = mood ? (mood.html ? plainOf(mood.html) : (mood.note ?? "").trim()) : "";
  if (moodText) written.push({ title: "", text: moodText.slice(0, 220) });
  const nothing = !acts.length && !doneCore.length && !tasksDone.length && !written.length;

  const sec = (title: string, items: ReactNode[]) =>
    items.length ? (
      <section className="hist-sec">
        <h3 className="day-note-title">{title}</h3>
        <ul className="hist-list">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <DayDialog label={`Day ${date}`} onClose={onClose}>
      <div className="scrap-head">
        <div>
          <div className="eyebrow">{date}</div>
          <h2>{mm ? mm.label : "What got done"}</h2>
        </div>
        {mm && (
          <span className="scrap-sticker big" aria-hidden="true">
            <Icon body={mm.icon} className="mi" />
          </span>
        )}
      </div>
      {mood?.mood && MOOD_NOTES[mood.mood] && <p className="small muted">{MOOD_NOTES[mood.mood]}</p>}
      <p className="hist-row">
        <span className={`hist-swatch l${level(score)}`} aria-hidden="true" />
        <span>
          {score} {score === 1 ? "thing" : "things"} logged{stats.length ? ` · ${stats.join(" · ")}` : ""}
        </span>
      </p>
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
      {sec(`Habits · ${doneCore.length} of ${coreHabits.length}`, doneCore.map((h) => h.title))}
      {sec("Me time", meDone.map((x) => x.label))}
      {sec(
        "Activities",
        manual.map((a) => (
          <>
            {a.title}
            {a.minutes ? <span className="muted"> · {hm(a.minutes)}</span> : null}
          </>
        )),
      )}
      {sec("Tasks done", tasksDone.map((t) => t.title))}
      {sec("Goals worked on", goals.map((g) => g.name))}
      {sec(
        "What I wrote",
        written.map((w) => (
          <>
            {w.title && <strong>{w.title}</strong>} {w.text}
          </>
        )),
      )}
      {nothing && !meDone.length && <p className="small muted" style={{ marginTop: 12 }}>Nothing else logged for this day.</p>}
      <div className="actions scrap-actions">
        <button type="button" className="wbtn soft small" aria-pressed={pinned} onClick={onPin}>
          {pinned ? "Unpin" : "Pin to the top"}
        </button>
        <Link href={`/calendar?day=${day}`} className="wbtn ghost small">
          Open in calendar
        </Link>
        <button type="button" className="wbtn primary small" onClick={onClose}>
          Close
        </button>
      </div>
    </DayDialog>
  );
}
