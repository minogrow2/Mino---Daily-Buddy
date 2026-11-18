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

/** Today’s daily habits: tick them off, reorder them, and add or edit your own. */
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
    if (!(await ask("Delete this custom habit? Past check marks stay in your history."))) return;
    edit((d) => ({ ...d, habits: d.habits.filter((x) => x.id !== h.id) }));
    deleteHabit(h.id).catch(fail);
  }

  return (
    <Card
      title="Daily checklist"
      eyebrow={`${done} of ${habits.length} done`}
      right={<button type="button" className="btn btn-sage btn-sm" onClick={() => setAdding(true)}>+ Add habit</button>}
    >
      <ErrorNote error={err} />
      <ul className="divide-y divide-[var(--line)]">
        {habits.map((h, i) => {
          const on = checked.has(h.id);
          return (
            <li key={h.id} className="flex items-center gap-2 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={h.title}
                onClick={() => toggle(h)}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm ${
                  on ? "border-[var(--sage-deep)] bg-[var(--sage-deep)] text-white" : "border-[rgba(63,107,80,0.45)] bg-[rgba(110,156,126,0.12)]"
                }`}
              >
                {on ? "✓" : ""}
              </button>
              <span className={`min-w-0 flex-1 ${on ? "text-muted line-through" : ""}`}>{h.title}</span>
              <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === habits.length - 1} aria-label="Move down">↓</button>
              {h.custom && (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing(h)}>Edit</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(h)}>Delete</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">Resets each day. Past days stay in your calendar.</p>

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
