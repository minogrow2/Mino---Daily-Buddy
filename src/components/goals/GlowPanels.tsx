"use client";

import { useState } from "react";
import { TextDialog } from "@/components/home/TextDialog";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { deleteHabit, setHabitCheck } from "@/lib/willow/actions";
import { ORDER_STATUS, loadGlowData, type GlowData } from "@/lib/willow/goals";
import {
  addClothingOrder,
  addGlowHabit,
  addWorkout,
  deleteClothingOrder,
  deleteWorkout,
  setOrderStatus,
} from "@/lib/willow/goals-actions";
import { FormModal, type FormField } from "./GoalDialogs";
import type { Ctx } from "./useLoad";
import { useLoad } from "./useLoad";

const num = (s: string) => {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error("Use whole numbers for sets, reps and minutes.");
  return Math.round(n);
};

const workoutFields = (today: string): FormField[] => [
  { name: "exercise", label: "Exercise", required: true, max: 100, placeholder: "e.g. Stretching or a short walk" },
  { name: "day", label: "Date", type: "date", required: true, value: today },
  { name: "sets", label: "Sets", type: "number", min: 0, hint: "optional" },
  { name: "reps", label: "Reps", type: "number", min: 0, hint: "optional" },
  { name: "minutes", label: "Minutes", type: "number", min: 0, hint: "optional" },
];

const orderFields = (today: string): FormField[] => [
  { name: "item", label: "Item", required: true, max: 140 },
  { name: "store", label: "Store", max: 80, value: "Pinduoduo" },
  { name: "order_day", label: "Order date", type: "date", required: true, value: today },
  { name: "status", label: "Status", type: "select", options: ORDER_STATUS.map((s) => [s, s]), value: "Ordered" },
];

/** Self-care habits, the workout journal and clothing orders, as in the legacy Glow Up page. */
export function GlowPanels() {
  const { ctx, error } = useLoad(loadGlowData, "glow");
  if (!ctx) {
    return (
      <>
        <ErrorNote error={error} />
        <p className="empty">Loading…</p>
      </>
    );
  }
  return <GlowBody ctx={ctx} />;
}

function GlowBody({ ctx }: { ctx: Ctx<GlowData> }) {
  const [adding, setAdding] = useState<"habit" | "workout" | "order" | null>(null);
  const { ask, dialog } = useConfirm();
  const d = ctx.data;
  const checked = new Set(d.checkedIds);
  const workouts = d.workouts.slice(0, 12);

  function toggleHabit(id: string) {
    const on = !checked.has(id);
    ctx.edit((x) => ({ ...x, checkedIds: on ? [...x.checkedIds, id] : x.checkedIds.filter((c) => c !== id) }));
    setHabitCheck(d.today, id, on).catch(ctx.fail);
  }

  async function removeHabit(id: string) {
    if (!(await ask("Delete this habit? Its past check marks stay in your history.", "Delete"))) return;
    ctx.edit((x) => ({ ...x, habits: x.habits.filter((h) => h.id !== id) }));
    deleteHabit(id).catch(ctx.fail);
  }

  async function removeWorkout(id: string) {
    if (!(await ask("Delete this workout entry?", "Delete"))) return;
    ctx.edit((x) => ({ ...x, workouts: x.workouts.filter((w) => w.id !== id) }));
    deleteWorkout(id).catch(ctx.fail);
  }

  async function removeOrder(id: string) {
    if (!(await ask("Remove this order from the tracker?", "Delete"))) return;
    ctx.edit((x) => ({ ...x, orders: x.orders.filter((o) => o.id !== id) }));
    deleteClothingOrder(id).catch(ctx.fail);
  }

  function changeOrder(id: string, status: string) {
    ctx.edit((x) => ({ ...x, orders: x.orders.map((o) => (o.id === id ? { ...o, status } : o)) }));
    setOrderStatus(id, status).catch(ctx.fail);
  }

  return (
    <div className="grid two">
      <Card
        eyebrow="Habits"
        title="Daily self-care"
        right={
          <button type="button" className="wbtn soft small" onClick={() => setAdding("habit")}>
            + Add habit
          </button>
        }
      >
        <ul className="list">
          {d.habits.map((h) => {
            const on = checked.has(h.id);
            return (
              <li key={h.id} className={`item${on ? " done" : ""}`}>
                <button type="button" className="check" role="checkbox" aria-checked={on} aria-label={h.title} onClick={() => toggleHabit(h.id)}>
                  {on ? "✓" : ""}
                </button>
                <span className="grow">{h.title}</span>
                <button type="button" className="wbtn danger small" onClick={() => removeHabit(h.id)}>
                  Delete
                </button>
              </li>
            );
          })}
          {d.habits.length === 0 && <li className="empty">No habits yet. Add the small things that help you feel good.</li>}
        </ul>
        <p className="small muted" style={{ marginTop: 10 }}>
          Consistency over extremes. Nothing here is about appearance-based guilt.
        </p>
      </Card>

      <Card
        eyebrow="Movement"
        title="Workout journal"
        right={
          <button type="button" className="wbtn soft small" onClick={() => setAdding("workout")}>
            + Log workout
          </button>
        }
      >
        <ul className="list">
          {workouts.map((w) => {
            const detail = [w.sets ? `${w.sets} sets` : "", w.reps ? `${w.reps} reps` : "", w.minutes ? `${w.minutes} min` : ""].filter(Boolean).join(" · ");
            return (
              <li key={w.id} className="item">
                <span className="grow">
                  <strong>{w.exercise}</strong> <span className="small muted">{fmtDay(w.day)}</span>
                  {detail && (
                    <>
                      <br />
                      <span className="small muted">{detail}</span>
                    </>
                  )}
                </span>
                <button type="button" className="wbtn danger small" onClick={() => removeWorkout(w.id)}>
                  Delete
                </button>
              </li>
            );
          })}
          {workouts.length === 0 && <li className="empty">Log a light home workout with sets, reps or minutes.</li>}
        </ul>
      </Card>

      <Card
        eyebrow="Wardrobe"
        title="Clothing orders and arrivals"
        right={
          <button type="button" className="wbtn soft small" onClick={() => setAdding("order")}>
            + Add order
          </button>
        }
      >
        <ul className="list">
          {d.orders.map((o) => {
            const known = (ORDER_STATUS as readonly string[]).includes(o.status);
            return (
              <li key={o.id} className="item">
                <span className="grow">
                  <strong>{o.item}</strong>
                  <br />
                  <span className="small muted">
                    {[o.store, o.order_day ? `ordered ${fmtDay(o.order_day)}` : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <select
                  className="winput"
                  style={{ width: "auto" }}
                  aria-label={`Status for ${o.item}`}
                  value={known ? o.status : ""}
                  onChange={(e) => changeOrder(o.id, e.target.value)}
                >
                  {!known && <option value="">Not set</option>}
                  {ORDER_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="button" className="wbtn danger small" onClick={() => removeOrder(o.id)}>
                  Delete
                </button>
              </li>
            );
          })}
          {d.orders.length === 0 && (
            <li className="empty">Track each order here, for example your Pinduoduo clothing orders, until it arrives.</li>
          )}
        </ul>
      </Card>

      {adding === "habit" && (
        <TextDialog
          title="New self-care habit"
          label="Habit"
          max={100}
          submit="Add habit"
          onClose={() => setAdding(null)}
          onSave={async (title) => {
            await addGlowHabit(title);
            ctx.reload();
          }}
        />
      )}
      {adding === "workout" && (
        <FormModal
          title="Log a workout"
          fields={workoutFields(d.today)}
          submit="Save workout"
          onClose={() => setAdding(null)}
          onSave={async (v) => {
            await addWorkout({
              day: v.day,
              exercise: v.exercise.trim(),
              sets: num(v.sets),
              reps: num(v.reps),
              minutes: num(v.minutes) ?? 0,
            });
            ctx.reload();
          }}
        />
      )}
      {adding === "order" && (
        <FormModal
          title="Add a clothing order"
          fields={orderFields(d.today)}
          submit="Add order"
          onClose={() => setAdding(null)}
          onSave={async (v) => {
            await addClothingOrder({ item: v.item.trim(), store: v.store.trim(), order_day: v.order_day || null, status: v.status });
            ctx.reload();
          }}
        />
      )}
      {dialog}
    </div>
  );
}

