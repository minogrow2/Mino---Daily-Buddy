"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, Modal, useConfirm } from "@/components/ui/Modal";
import { daysInMonth, fmtDay, fmtMonth, monthStartOf, shiftMonth, weekday } from "@/lib/dates";
import { addEvent, addTask, deleteEvent, deleteTask } from "@/lib/willow/actions";
import type { HomeCtx } from "./context";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** A month of real dates. Dots show what is planned or logged. Tap a day to plan it. */
export function MonthPreview({ ctx, month, setMonth }: { ctx: HomeCtx; month: string; setMonth: (m: string) => void }) {
  const { data } = ctx;
  const today = data.today;
  const [planDay, setPlanDay] = useState<string | null>(null);
  const first = `${month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const total = daysInMonth(first);

  // Dot codes match the legacy calendar: t task, e event, m due milestone, a logged activity.
  const dotsOn = (d: string) => {
    const out: string[] = [];
    if (data.tasks.some((t) => t.day === d)) out.push("t");
    if (data.events.some((e) => e.day === d)) out.push("e");
    if (data.milestones.some((m) => m.due_day === d)) out.push("m");
    if (data.activities.some((a) => a.day === d)) out.push("a");
    return out;
  };

  return (
    <Card
      id="month-preview"
      eyebrow="Month"
      title={fmtMonth(first)}
      right={
        <div className="row-inline" style={{ gap: 4 }}>
          <button type="button" className="wbtn ghost small" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </button>
          {month !== monthStartOf(today).slice(0, 7) && (
            <button type="button" className="wbtn ghost small" onClick={() => setMonth(monthStartOf(today).slice(0, 7))}>
              Today
            </button>
          )}
          <button type="button" className="wbtn ghost small" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </button>
        </div>
      }
    >
      <div className="mcal">
        {DOW.map((x) => (
          <div key={x} className="mcal-dow">
            {x}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} className="mcell blank" aria-hidden="true" />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const k = i + 1;
          const d = `${month}-${String(k).padStart(2, "0")}`;
          const planned = data.tasks.filter((t) => t.day === d).length + data.events.filter((e) => e.day === d).length;
          const label = fmtDay(d, { weekday: "long", month: "long", day: "numeric" });
          return (
            <button key={d} type="button" className={`mcell${d === today ? " today" : ""}`} aria-label={`${label}${planned ? `, ${planned} planned` : ""}`} onClick={() => setPlanDay(d)}>
              <span className="mnum">{k}</span>
              <span className="mdots" aria-hidden="true">
                {dotsOn(d).map((c) => (
                  <i key={c} className={`mdot ${c}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mlegend small muted">
        <span>
          <i className="mdot t" />
          Task
        </span>
        <span>
          <i className="mdot e" />
          Event
        </span>
        <span>
          <i className="mdot m" />
          Due
        </span>
        <span>
          <i className="mdot a" />
          Logged
        </span>
      </div>
      <div className="row-inline" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <span className="small muted">Tap a day to add a task or event.</span>
        <Link className="wbtn ghost small" href="/calendar">
          Open calendar
        </Link>
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
    <Modal eyebrow="Plan the day" title={fmtDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} onClose={onClose}>
      {empty ? (
        <p className="muted small">Nothing planned for this day yet.</p>
      ) : (
        <ul className="list">
          {events.map((ev) => (
            <li key={ev.id} className="item">
              <span className="grow">
                ◷ {ev.title}
                <br />
                <span className="small muted">Event{ev.time_of_day ? ` · ${ev.time_of_day}` : ""}</span>
              </span>
              <button type="button" className="wbtn danger small" onClick={() => removeEvent(ev.id)}>
                Delete
              </button>
            </li>
          ))}
          {tasks.map((t) => (
            <li key={t.id} className={`item${t.done ? " done" : ""}`}>
              <span className="grow">
                {t.done ? "✓" : "○"} {t.title}
                <br />
                <span className="small muted">{t.done ? "Task · done" : "Task"}</span>
              </span>
              <button type="button" className="wbtn danger small" onClick={() => removeTask(t.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="dlg" style={{ padding: 0, marginTop: 8 }}>
        <label>
          Type
          <select className="winput" value={kind} onChange={(e) => setKind(e.target.value as "task" | "event")}>
            <option value="task">Task</option>
            <option value="event">Event</option>
          </select>
        </label>
        <label>
          Title
          <input className="winput" value={title} maxLength={140} placeholder="What is it?" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Time <span className="muted">· optional, for events</span>
          <input type="time" className="winput" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="actions">
          <button className="wbtn primary">Add to this day</button>
        </div>
      </form>
      {dialog}
    </Modal>
  );
}
