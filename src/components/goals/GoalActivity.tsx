"use client";

import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/Modal";
import { CATS, type GoalKey } from "@/lib/willow/constants";
import { deleteActivity, setGoalDay } from "@/lib/willow/actions";
import { hm } from "@/lib/willow/logic";
import { fmtDay } from "@/lib/dates";
import type { GoalPageData } from "@/lib/willow/goals";
import type { Ctx } from "./useLoad";

/** Log today’s work on this goal, and the history of what was logged. Both save to the activity record. */
export function GoalActivity({ ctx, goal, name }: { ctx: Ctx<GoalPageData>; goal: GoalKey; name: string }) {
  const { ask, dialog } = useConfirm();
  const today = ctx.data.today;
  const acts = ctx.data.activities;
  const loggedToday = acts.some((a) => a.day === today && a.checklist);

  // The day’s log goes through setGoalDay, the same write the Home page’s weekly goals use.
  function logToday() {
    setGoalDay(today, goal, name, true).then(() => ctx.reload()).catch(ctx.fail);
  }
  function undoToday() {
    setGoalDay(today, goal, name, false).then(() => ctx.reload()).catch(ctx.fail);
  }

  async function remove(id: string) {
    if (!(await ask("Delete this activity record?"))) return;
    ctx.edit((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
    deleteActivity(id).catch(ctx.fail);
  }

  return (
    <Card eyebrow="Log" title="Activity history">
      <div className="row-inline" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className="small muted">{loggedToday ? "Logged for today." : "Nothing logged for today yet."}</span>
        {loggedToday ? (
          <button type="button" className="wbtn ghost small" onClick={undoToday}>
            Undo today
          </button>
        ) : (
          <button type="button" className="wbtn soft small" onClick={logToday}>
            Log work today
          </button>
        )}
      </div>
      {acts.length === 0 ? (
        <div className="empty">Log what you worked on for this goal.</div>
      ) : (
        <ul className="list">
          {acts.slice(0, 15).map((a) => (
            <li key={a.id} className="item">
              <span className="grow">
                {a.title}
                <br />
                <span className="small muted">
                  {fmtDay(a.day)}
                  {CATS[a.category] ? ` · ${CATS[a.category].label}` : ""}
                  {a.minutes ? ` · ${hm(a.minutes)}` : ""}
                </span>
              </span>
              <button type="button" className="wbtn danger small" onClick={() => remove(a.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </Card>
  );
}
