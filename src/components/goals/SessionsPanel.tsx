"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay, todayYMD } from "@/lib/dates";
import { loadAiSessions, type AiSession } from "@/lib/willow/goals";
import { addAiSession, deleteAiSession } from "@/lib/willow/goals-actions";
import { FormModal, type FormField } from "./GoalDialogs";
import type { Ctx } from "./useLoad";
import { useLoad } from "./useLoad";

type TextKey = "explored" | "learned" | "configured" | "built" | "problems" | "next_plan";
const ITEMS: [TextKey, string][] = [
  ["explored", "Explored"],
  ["learned", "Learned"],
  ["configured", "Configured"],
  ["built", "Built"],
  ["problems", "Problems"],
  ["next_plan", "Next"],
];

const sessionFields = (): FormField[] => [
  { name: "day", label: "Date", type: "date", required: true, value: todayYMD() },
  { name: "explored", label: "What I explored", type: "textarea", max: 500 },
  { name: "learned", label: "What I learned", type: "textarea", max: 500 },
  { name: "configured", label: "What I configured", type: "textarea", max: 500 },
  { name: "built", label: "What I built", type: "textarea", max: 500 },
  { name: "problems", label: "Problems encountered", type: "textarea", max: 500 },
  { name: "next_plan", label: "What I want to explore next", type: "textarea", max: 500 },
  { name: "minutes", label: "Minutes", type: "number", min: 0, hint: "optional" },
];

/** The AI session log on the Learn AI page: what was explored, learned, configured, built, what went wrong and what is next. */
export function SessionsPanel() {
  const { ctx, error } = useLoad(loadAiSessions, "ai");
  if (!ctx) {
    return (
      <>
        <ErrorNote error={error} />
        <p className="empty">Loading…</p>
      </>
    );
  }
  return <SessionsBody ctx={ctx} />;
}

function SessionsBody({ ctx }: { ctx: Ctx<AiSession[]> }) {
  const [adding, setAdding] = useState(false);
  const { ask, dialog } = useConfirm();
  const sessions = ctx.data;

  async function save(v: Record<string, string>) {
    const minutes = v.minutes.trim() === "" ? 0 : Math.round(Number(v.minutes));
    if (!(minutes >= 0)) throw new Error("Minutes can’t be negative.");
    await addAiSession({
      day: v.day,
      explored: v.explored.trim(),
      learned: v.learned.trim(),
      configured: v.configured.trim(),
      built: v.built.trim(),
      problems: v.problems.trim(),
      next_plan: v.next_plan.trim(),
      minutes,
    });
    ctx.reload();
  }

  async function remove(s: AiSession) {
    if (!(await ask("Delete this session log?", "Delete"))) return;
    ctx.edit((list) => list.filter((x) => x.id !== s.id));
    deleteAiSession(s.id).catch(ctx.fail);
  }

  return (
    <Card
      eyebrow="Session log"
      title="AI sessions"
      right={
        <button type="button" className="wbtn soft small" onClick={() => setAdding(true)}>
          + Log session
        </button>
      }
    >
      {sessions.length === 0 ? (
        <div className="empty">No sessions yet. Log what you explored, learned, configured, built, what went wrong, and what is next.</div>
      ) : (
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id} className="item" style={{ display: "block", padding: "12px 0" }}>
              <div className="row-inline" style={{ justifyContent: "space-between" }}>
                <strong>{fmtDay(s.day)}</strong>
                <button type="button" className="wbtn danger small" onClick={() => remove(s)}>
                  Delete
                </button>
              </div>
              {ITEMS.filter(([k]) => s[k]).map(([k, label]) => (
                <p key={k} className="small" style={{ marginTop: 6 }}>
                  <span className="muted">{label}:</span> {s[k]}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <FormModal title="Log an AI session" eyebrow="Learn AI" fields={sessionFields()} submit="Save session" onSave={save} onClose={() => setAdding(false)} />
      )}
      {dialog}
    </Card>
  );
}
