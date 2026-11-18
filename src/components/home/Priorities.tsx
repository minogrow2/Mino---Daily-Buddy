"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { addTask, deleteTask, patchTask, swapTaskOrder } from "@/lib/willow/actions";
import type { Task } from "@/lib/willow/types";
import type { HomeCtx } from "./context";
import { TextDialog } from "./TextDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
const MAX_PRIORITIES = 3;

/** Today’s tasks. Star up to three as the priorities; everything else can wait. */
export function Priorities({ ctx }: { ctx: HomeCtx }) {
  const { data, edit, reload } = ctx;
  const today = data.today;
  const tasks = data.tasks.filter((t) => t.day === today).sort((a, b) => a.sort_order - b.sort_order);
  const priorities = tasks.filter((t) => t.priority);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const { ask, dialog } = useConfirm();

  const fail = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };
  const patch = (id: string, p: Partial<Task>) => edit((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }));

  function toggleDone(t: Task) {
    patch(t.id, { done: !t.done });
    patchTask(t.id, { done: !t.done }).catch(fail);
  }

  function togglePriority(t: Task) {
    if (!t.priority && priorities.length >= MAX_PRIORITIES) {
      setErr("Three priorities is the limit. Un-star one first.");
      return;
    }
    setErr(null);
    patch(t.id, { priority: !t.priority });
    patchTask(t.id, { priority: !t.priority }).catch(fail);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= tasks.length) return;
    const a = tasks[i];
    const b = tasks[j];
    edit((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === a.id ? { ...t, sort_order: b.sort_order } : t.id === b.id ? { ...t, sort_order: a.sort_order } : t)),
    }));
    swapTaskOrder(a, b).catch(fail);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr("Name the task first.");
    setErr(null);
    const next = Math.max(0, ...tasks.map((x) => x.sort_order)) + 1;
    setTitle("");
    try {
      const row = await addTask(today, t.slice(0, 140), next);
      edit((d) => ({ ...d, tasks: [...d.tasks, { ...row, day: today }] }));
    } catch (er) {
      fail(er);
    }
  }

  async function remove(t: Task) {
    if (!(await ask("Delete this task?"))) return;
    edit((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }));
    deleteTask(t.id).catch(fail);
  }

  return (
    <Card title="Today’s priorities" eyebrow={`${priorities.length} of ${MAX_PRIORITIES} priorities`}>
      <ErrorNote error={err} />
      {priorities.length ? (
        <ol className="mb-4 list-decimal space-y-1 pl-5">
          {priorities.map((t) => (
            <li key={t.id} className={t.done ? "text-muted line-through" : ""}>{t.title}</li>
          ))}
        </ol>
      ) : (
        <p className="mb-4 text-sm text-muted">Star up to three tasks below to make them today’s priorities.</p>
      )}

      <ul className="divide-y divide-[var(--line)]">
        {tasks.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2 py-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={t.done}
              aria-label={t.title}
              onClick={() => toggleDone(t)}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm ${
                t.done ? "border-[var(--sage-deep)] bg-[var(--sage-deep)] text-white" : "border-[rgba(63,107,80,0.45)] bg-[rgba(110,156,126,0.12)]"
              }`}
            >
              {t.done ? "✓" : ""}
            </button>
            <span className={`min-w-0 flex-1 ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
            <button type="button" className="btn btn-sm" aria-pressed={t.priority} aria-label="Priority" onClick={() => togglePriority(t)}>
              {t.priority ? "★" : "☆"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(t)}>Edit</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(t)}>Delete</button>
          </li>
        ))}
        {!tasks.length && <li className="py-3 text-sm text-muted">No tasks yet today. Add one below.</li>}
      </ul>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input className="input" value={title} maxLength={140} placeholder="Add a task for today" aria-label="New task" onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-primary btn-sm shrink-0">Add</button>
      </form>

      {editing && (
        <TextDialog
          title="Edit task"
          label="Task"
          initial={editing.title}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            const id = editing.id;
            patch(id, { title: value });
            await patchTask(id, { title: value }).catch((er) => {
              fail(er);
              throw er;
            });
          }}
        />
      )}
      {dialog}
    </Card>
  );
}
