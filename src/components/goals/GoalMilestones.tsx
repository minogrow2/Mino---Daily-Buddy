"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { HORIZONS, type GoalPageData } from "@/lib/willow/goals";
import { addMilestone, deleteMilestone, setMilestoneDone } from "@/lib/willow/goals-actions";
import type { GoalKey } from "@/lib/willow/constants";
import { FormModal, type FormField } from "./GoalDialogs";
import type { Ctx } from "./useLoad";

const fields: FormField[] = [
  { name: "title", label: "Milestone", required: true, max: 140 },
  { name: "horizon", label: "Type", type: "select", options: HORIZONS.map((h) => [h, h]), value: "Short-term" },
  { name: "due_day", label: "Due date", type: "date", hint: "optional" },
];

/** The milestones for a goal: tick them off, add with a due date, or delete. */
export function GoalMilestones({ ctx, goal }: { ctx: Ctx<GoalPageData>; goal: GoalKey }) {
  const [adding, setAdding] = useState(false);
  const { ask, dialog } = useConfirm();
  const ms = [...ctx.data.milestones].sort((a, b) => (a.due_day ?? "").localeCompare(b.due_day ?? ""));
  const done = ms.filter((m) => m.done).length;

  function toggle(id: string, next: boolean) {
    ctx.edit((d) => ({ ...d, milestones: d.milestones.map((m) => (m.id === id ? { ...m, done: next } : m)) }));
    setMilestoneDone(id, next).catch(ctx.fail);
  }

  async function remove(id: string) {
    if (!(await ask("Remove this milestone?"))) return;
    ctx.edit((d) => ({ ...d, milestones: d.milestones.filter((m) => m.id !== id) }));
    deleteMilestone(id).catch(ctx.fail);
  }

  return (
    <Card
      title="Milestones"
      eyebrow={`Roadmap · ${done} of ${ms.length} done`}
      right={
        <button type="button" className="wbtn soft small" onClick={() => setAdding(true)}>
          + Milestone
        </button>
      }
    >
      <ul className="list">
        {ms.map((m) => (
          <li key={m.id} className={`item${m.done ? " done" : ""}`}>
            <button
              type="button"
              className="check"
              role="checkbox"
              aria-checked={m.done}
              aria-label={m.title}
              onClick={() => toggle(m.id, !m.done)}
            >
              {m.done ? "✓" : ""}
            </button>
            <span className="grow">
              {m.title}
              <br />
              <span className="small muted">
                {m.horizon}
                {m.due_day ? ` · due ${fmtDay(m.due_day)}` : ""}
              </span>
            </span>
            <button type="button" className="wbtn danger small" onClick={() => remove(m.id)}>
              Delete
            </button>
          </li>
        ))}
        {ms.length === 0 && <li className="empty">Add short-term, weekly, monthly or long-term milestones with due dates.</li>}
      </ul>
      {adding && (
        <FormModal
          title="New milestone"
          fields={fields}
          submit="Add milestone"
          onClose={() => setAdding(false)}
          onSave={async (v) => {
            await addMilestone(goal, { title: v.title.trim(), horizon: v.horizon, due_day: v.due_day || null });
            ctx.reload();
          }}
        />
      )}
      {dialog}
    </Card>
  );
}
