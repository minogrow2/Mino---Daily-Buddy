"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GoalNotes } from "@/components/notes/GoalNotes";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { addDays } from "@/lib/dates";
import { GOAL_TINT, goalById, type GoalKey } from "@/lib/willow/constants";
import { loadGoalPage, type GoalPageData } from "@/lib/willow/goals";
import { setMoneyActive } from "@/lib/willow/goals-actions";
import { hm } from "@/lib/willow/logic";
import "@/app/willow-goals.css";
import { GoalActivity } from "./GoalActivity";
import { GoalMilestones } from "./GoalMilestones";
import { GoalResources } from "./GoalResources";
import type { Ctx } from "./useLoad";
import { useLoad } from "./useLoad";

/** One goal page: the header, milestones and activity, any goal-specific panels, the notes and the resources. */
export function GoalPage({ goal, panels }: { goal: GoalKey; panels?: ReactNode }) {
  const { ctx, error } = useLoad(() => loadGoalPage(goal), goal);
  const g = goalById(goal);
  if (!g) return null;

  const status = goal === "money" && ctx?.data.moneyActive ? "Active · you chose to start" : g.status;
  const ms = ctx?.data.milestones ?? [];
  const acts = ctx?.data.activities ?? [];
  const done = ms.filter((m) => m.done).length;
  const mins = acts.reduce((s, a) => s + a.minutes, 0);
  const last30 = ctx ? acts.filter((a) => a.day >= addDays(ctx.data.today, -30)).length : null;

  return (
    <div className="grid" style={{ marginTop: 8 }}>
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <Link className="small muted" href="/goals">
          ← All goals
        </Link>
      </div>

      <section className="card reveal goal-hero" style={{ "--tint": GOAL_TINT[goal] } as CSSProperties}>
        <div className="eyebrow">
          {g.no} · {status}
        </div>
        <h1 style={{ margin: "6px 0 8px" }}>{g.name}</h1>
        <p className="muted">{g.blurb}</p>
        <div className="stats" style={{ marginTop: 14 }}>
          <div className="stat">
            <div className="small muted">Milestones</div>
            <div className="v">{ctx ? `${done}/${ms.length}` : "—"}</div>
          </div>
          <div className="stat">
            <div className="small muted">Activities</div>
            <div className="v">{ctx ? acts.length : "—"}</div>
          </div>
          <div className="stat">
            <div className="small muted">Time logged</div>
            <div className="v">{ctx ? hm(mins) : "—"}</div>
          </div>
          <div className="stat">
            <div className="small muted">Last 30 days</div>
            <div className="v">{last30 ?? "—"}</div>
          </div>
        </div>
      </section>

      <ErrorNote error={error} />
      {!ctx ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="grid two">
            <GoalMilestones ctx={ctx} goal={goal} />
            <GoalActivity ctx={ctx} goal={goal} name={g.name} />
          </div>
          {goal === "money" && (
            <div className="grid two">
              <MoneyCard ctx={ctx} />
            </div>
          )}
          {panels}
        </>
      )}

      <div className="goal-notes">
        <GoalNotes goal={goal} name={g.name} />
      </div>
      {ctx && <GoalResources ctx={ctx} goal={goal} />}
    </div>
  );
}

/** Internet Money stays in preparation until the person chooses to start. Activating it changes this label only. */
function MoneyCard({ ctx }: { ctx: Ctx<GoalPageData> }) {
  const on = ctx.data.moneyActive;
  function toggle() {
    ctx.edit((d) => ({ ...d, moneyActive: !on }));
    setMoneyActive(!on).catch(ctx.fail);
  }
  return (
    <Card eyebrow="Status" title="Your decision">
      <p className="small muted">
        Internet Money stays in preparation until you decide to start. Activating it changes this label only. The expense tracker isn’t built yet.
      </p>
      <div className="row-inline" style={{ marginTop: 12 }}>
        <span className={`tag${on ? "" : " muted"}`}>{on ? "Active" : "Preparation phase"}</span>
        <button type="button" className="wbtn soft small" onClick={toggle}>
          {on ? "Move back to preparation" : "Mark as active"}
        </button>
      </div>
    </Card>
  );
}
