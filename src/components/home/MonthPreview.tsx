"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, Modal, useConfirm } from "@/components/ui/Modal";
import { daysInMonth, fmtDay, fmtMonth, monthStartOf, shiftMonth, weekday } from "@/lib/dates";
import { addEvent, addTask, deleteEvent, deleteTask } from "@/lib/willow/actions";
import type { HomeCtx } from "./context";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** A month of real dates. Each day shows dots for what is planned or logged. Tap a day to plan it. */
export function MonthPreview({ ctx, month, setMonth }: { ctx: HomeCtx; month: string; setMonth: (m: string) => void }) {
  const { data } = ctx;
  const today = data.today;
  const [planDay, setPlanDay] = useState<string | null>(null);
  const first = `${month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const total = daysInMonth(first);

  const dotsOn = (d: string) => {
    const out: string[] = [];
    if (data.tasks.some((t) => t.day === d)) out.push("bg-[var(--rose)]");
    if (data.events.some((e) => e.day === d)) out.push("bg-[var(--sage-deep)]");
    if (data.milestones.some((m) => m.due_day === d)) out.push("bg-[var(--butter-deep)]");
    if (data.activities.some((a) => a.day === d)) out.push("bg-[var(--pink)] ring-1 ring-[var(--rose)]");
    return out;
  };

  return (
    <Card
      eyebrow="Month"
      title={fmtMonth(first)}
      right={
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-sm" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          {month !== monthStartOf(today).slice(0, 7) && (
            <button type="button" className="btn btn-sm" onClick={() => setMonth(monthStartOf(today).slice(0, 7))}>Today</button>
          )}
          <button type="button" className="btn btn-sm" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {DOW.map((x) => <div key={x} className="py-1">{x}</div>)}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} aria-hidden />)}
        {Array.from({ length: total }, (_, i) => {
          const k = i + 1;
          const d = `${month}-${String(k).padStart(2, "0")}`;
          const planned = data.tasks.filter((t) => t.day === d).length + data.events.filter((e) => e.day === d).length;
          const label = fmtDay(d, { weekday: "long", month: "long", day: "numeric" });
          return (
            <button
              key={d}
              type="button"
              aria-label={`${label}${planned ? `, ${planned} planned` : ""}`}
              onClick={() => setPlanDay(d)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl border border-[rgba(63,107,80,0.25)] bg-[rgba(110,156,126,0.1)] text-sm hover:bg-[rgba(110,156,126,0.2)] ${d === today ? "ring-2 ring-[var(--rose)]" : ""}`}
            >
              <span className="tabular-nums">{k}</span>
              <span className="mt-0.5 flex h-2 gap-0.5" aria-hidden>
                {dotsOn(d).map((c, j) => <i key={j} className={`h-1.5 w-1.5 rounded-full ${c}`} />)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--rose)]" />Task</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--sage-deep)]" />Event</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--butter-deep)]" />Due</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--pink)]" />Logged</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">Tap a day to add a task or event.</span>
      </div>
      {planDay && <PlannerDialog day={planDay} ctx={ctx} onClose={() => setPlanDay(null)} />}
    </Card>
  );
}

/** The day planner: what is on that day, and a form to add a task or an event. */
function PlannerDialog({ day, ctx, onClose }: { day: string; ctx: HomeCtx; onClose: () => void }) {
  const { data, edit, reload } = ctx;
  const events = data.events.filter((e) => e.day === day).sort((a, b) => (a.time_of_day ?? "").localeCompare(b.time_of_day ?? ""));
  const tasks = data.tasks.filter((t) => t.day === day).sort((a, b) => a.sort_order - b.sort_order);
  const [kind, setKind] = useState<"task" | "event">("task");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const fail = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };

  async function add(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("Give it a short title first.");
    setErr(null);
    setTitle("");
    try {
      if (kind === "event") {
        const row = await addEvent(day, t.slice(0, 140), time);
        edit((d) => ({ ...d, events: [...d.events, { ...row, day }] }));
        setTime("");
      } else {
        const next = Math.max(0, ...tasks.map((x) => x.sort_order)) + 1;
        const row = await addTask(day, t.slice(0, 140), next);
        edit((d) => ({ ...d, tasks: [...d.tasks, { ...row, day }] }));
      }
    } catch (er) {
      fail(er);
    }
  }

  async function removeEvent(id: string) {
    if (!(await ask("Delete this event?"))) return;
    edit((d) => ({ ...d, events: d.events.filter((x) => x.id !== id) }));
    deleteEvent(id).catch(fail);
  }

  async function removeTask(id: string) {
    if (!(await ask("Delete this task?"))) return;
    edit((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
    deleteTask(id).catch(fail);
  }

  const empty = !events.length && !tasks.length;

  return (
    <Modal title={fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-muted">Plan the day</p>
        {empty && <p className="text-sm text-muted">Nothing planned for this day yet.</p>}
        <ul className="divide-y divide-[var(--line)]">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                ◷ {ev.title}
                <br />
                <span className="text-xs text-muted">Event{ev.time_of_day ? ` · ${ev.time_of_day}` : ""}</span>
              </span>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeEvent(ev.id)}>Delete</button>
            </li>
          ))}
          {tasks.map((t) => (
            <li key={t.id} className={`flex items-center gap-2 py-2 ${t.done ? "text-muted" : ""}`}>
              <span className="min-w-0 flex-1">
                {t.done ? "✓" : "○"} {t.title}
                <br />
                <span className="text-xs text-muted">{t.done ? "Task · done" : "Task"}</span>
              </span>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeTask(t.id)}>Delete</button>
            </li>
          ))}
        </ul>

        <form onSubmit={add} className="space-y-3 border-t border-[var(--line)] pt-4">
          <ErrorNote error={err} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="plan-kind">Type</label>
              <select id="plan-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "task" | "event")}>
                <option value="task">Task</option>
                <option value="event">Event</option>
              </select>
            </div>
            {kind === "event" && (
              <div>
                <label className="label" htmlFor="plan-time">Time <span className="text-muted">· optional</span></label>
                <input id="plan-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="plan-title">Title</label>
            <input id="plan-title" className="input" value={title} maxLength={140} placeholder="What is it?" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm">Add to this day</button>
          </div>
        </form>
      </div>
      {dialog}
    </Modal>
  );
}
