"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { addHabit, deleteHabit, renameHabit, setHabitCheck, swapOrder } from "@/lib/willow/actions";
import { checkedOn, coreHabits } from "@/lib/willow/logic";
import type { Habit } from "@/lib/willow/types";
import type { HomeCtx } from "./context";
import { TextDialog } from "./TextDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Today’s daily habits: tick them off, reorder them, add, rename or remove them. */
export function Checklist({ ctx }: { ctx: HomeCtx }) {
  const { data, edit, reload } = ctx;
  const habits = coreHabits(data.habits);
  const checked = checkedOn(data.checks, data.today);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const { ask, dialog } = useConfirm();
  const done = habits.filter((h) => checked.has(h.id)).length;

  const fail = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };

  function toggle(h: Habit) {
    const on = !checked.has(h.id);
    edit((d) => ({
      ...d,
      checks: on
        ? [...d.checks, { day: d.today, habit_id: h.id }]
        : d.checks.filter((c) => !(c.day === d.today && c.habit_id === h.id)),
    }));
    setHabitCheck(data.today, h.id, on).catch(fail);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= habits.length) return;
    const a = habits[i];
    const b = habits[j];
    edit((d) => ({
      ...d,
      habits: d.habits.map((h) => (h.id === a.id ? { ...h, sort_order: b.sort_order } : h.id === b.id ? { ...h, sort_order: a.sort_order } : h)),
    }));
    swapOrder(a, b).catch(fail);
  }

  async function remove(h: Habit) {
    if (!(await ask("Remove this habit from your checklist? Its past check marks stay in your history.", "Remove"))) return;
    edit((d) => ({ ...d, habits: d.habits.filter((x) => x.id !== h.id) }));
    deleteHabit(h.id).catch(fail);
  }

  return (
    <Card id="checklist" title="Daily checklist" eyebrow={`${done} of ${habits.length} done`}>
      <ErrorNote error={err} />
      <ul className="list">
        {habits.map((h, i) => {
          const on = checked.has(h.id);
          return (
            <li key={h.id} className={`item${on ? " done" : ""}`}>
              <button type="button" className="check" role="checkbox" aria-checked={on} aria-label={h.title} onClick={() => toggle(h)}>
                {on ? "✓" : ""}
              </button>
              <span className="grow">{h.title}</span>
              <span className="row-inline" style={{ gap: 2 }}>
                <button type="button" className="wbtn ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className="wbtn ghost small" onClick={() => move(i, 1)} disabled={i === habits.length - 1} aria-label="Move down">
                  ↓
                </button>
                {h.custom && (
                  <button type="button" className="wbtn ghost small" onClick={() => setEditing(h)}>
                    Edit
                  </button>
                )}
                <button type="button" className="wbtn danger small" onClick={() => remove(h)}>
                  Remove
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="row-inline" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <span className="small muted">Resets each day. Past days stay in your calendar.</span>
        <button type="button" className="wbtn soft small" onClick={() => setAdding(true)}>
          + Add habit
        </button>
      </div>

      {adding && (
        <TextDialog
          title="New daily habit"
          label="Habit"
          max={100}
          submit="Add habit"
          onClose={() => setAdding(false)}
          onSave={async (title) => {
            const next = Math.max(0, ...data.habits.map((h) => h.sort_order)) + 1;
            const row = await addHabit(title, next);
            edit((d) => ({ ...d, habits: [...d.habits, row] }));
          }}
        />
      )}
      {editing && (
        <TextDialog
          title="Edit habit"
          label="Habit"
          initial={editing.title}
          max={100}
          onClose={() => setEditing(null)}
          onSave={async (title) => {
            const id = editing.id;
            edit((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, title } : h)) }));
            await renameHabit(id, title);
          }}
        />
      )}
      {dialog}
    </Card>
  );
}
