"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { plainOf } from "@/lib/notes";
import { GOALS, ME_TIME, moodOf } from "@/lib/willow/constants";
import { loadDay } from "@/lib/willow/data";
import { hm } from "@/lib/willow/logic";

type Day = Awaited<ReturnType<typeof loadDay>>;

/** A short review of one past day: what got done, not the whole record. */
export function DayDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const [d, setD] = useState<Day | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadDay(day)
      .then((r) => {
        if (alive) setD(r);
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message);
      });
    return () => {
      alive = false;
    };
  }, [day]);

  const mood = moodOf(d?.mood?.mood);
  const habits = d ? d.habits.filter((h) => d.checkedIds.includes(h.id)) : [];
  const meDone = d ? ME_TIME.filter((m) => d.activities.some((a) => a.me_key === m.key)) : [];
  const manual = d ? d.activities.filter((a) => !a.me_key && !a.checklist) : [];
  const goals = d ? [...new Set(d.activities.map((a) => a.goal_id).filter((g): g is string => !!g))] : [];
  const tasks = d ? d.tasks.filter((t) => t.done) : [];
  const minutes = d ? d.activities.filter((a) => a.minutes > 0).reduce((t, a) => t + a.minutes, 0) : 0;

  return (
    <Modal title={fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} onClose={onClose} wide>
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-wide text-muted">{mood ? mood.label : "What got done"}</p>
        <ErrorNote error={err} />
        {!d && !err && <p className="text-sm text-muted">Loading…</p>}
        {d && (
          <>
            <Section title={`Habits · ${habits.length} of ${d.habits.length}`}>
              {habits.map((h) => <li key={h.id}>{h.title}</li>)}
            </Section>
            <Section title="Me time">
              {meDone.map((m) => <li key={m.key}>{m.label}</li>)}
            </Section>
            <Section title="Activities">
              {manual.map((a) => <li key={a.id}>{a.title}{a.minutes ? <span className="text-muted"> · {hm(a.minutes)}</span> : null}</li>)}
              {minutes > 0 && <li className="text-muted">{hm(minutes)} logged in total</li>}
            </Section>
            <Section title="Goals worked on">
              {goals.map((g) => <li key={g}>{GOALS.find((x) => x.id === g)?.name ?? g}</li>)}
            </Section>
            <Section title="Tasks done">
              {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
            </Section>
            <Section title="What I wrote">
              {d.journal.map((j) => {
                const text = j.html ? plainOf(j.html) : j.body;
                return text ? <li key={j.id}><strong>{j.title || "Entry"}</strong> {text.slice(0, 220)}</li> : null;
              })}
              {d.mood?.html && <li>{plainOf(d.mood.html).slice(0, 220)}</li>}
            </Section>
            {!habits.length && !meDone.length && !manual.length && !tasks.length && !d.journal.length && !d.mood && (
              <p className="text-sm text-muted">Nothing was logged for this day.</p>
            )}
          </>
        )}
        <div className="flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(items) && items.length === 0) return null;
  return (
    <section>
      <h3 className="font-display text-lg">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{items}</ul>
    </section>
  );
}
