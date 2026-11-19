"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { COURSE_STATUS, loadCourses, type Course, type CourseValues } from "@/lib/willow/goals";
import { addCourse, addCourseLesson, deleteCourse, setCourseStatus, updateCourse } from "@/lib/willow/goals-actions";
import { pct } from "@/lib/willow/logic";
import { FormModal, type FormField } from "./GoalDialogs";
import type { Ctx } from "./useLoad";
import { useLoad } from "./useLoad";

const courseFields = (c: Course | null): FormField[] => [
  { name: "name", label: "Course name", required: true, max: 140, value: c?.name ?? "" },
  { name: "platform", label: "Platform", max: 80, placeholder: "e.g. Coursera", value: c?.platform ?? "" },
  { name: "lessons_total", label: "Total lessons", type: "number", min: 1, required: true, value: c ? String(c.lessons_total) : "" },
  { name: "lessons_done", label: "Lessons done", type: "number", min: 0, hint: "optional", value: c ? String(c.lessons_done) : "" },
  { name: "status", label: "Status", type: "select", options: COURSE_STATUS.map((s) => [s, s]), value: c?.status ?? "Not started" },
  { name: "started_on", label: "Day you started", type: "date", hint: "if you have started", value: c?.started_on ?? "" },
  { name: "certificate", label: "Certificate earned?", type: "select", options: [["no", "Not yet"], ["yes", "Yes"]], value: c?.certificate ? "yes" : "no" },
];

/** Checks the form and returns the course as it is saved. Lessons done never goes past the total. */
function courseValues(v: Record<string, string>): CourseValues {
  const total = Math.round(Number(v.lessons_total));
  if (!(total >= 1)) throw new Error("Total lessons needs to be at least 1.");
  const doneRaw = v.lessons_done.trim() === "" ? 0 : Math.round(Number(v.lessons_done));
  if (!(doneRaw >= 0)) throw new Error("Lessons done can’t be negative.");
  return {
    name: v.name.trim(),
    platform: v.platform.trim(),
    lessons_total: total,
    lessons_done: Math.min(total, doneRaw),
    status: v.status,
    started_on: v.started_on || null,
    certificate: v.certificate === "yes",
  };
}

/** The monthly courses: a status dropdown that saves at once, +1 lesson, the full edit form and delete. */
export function CoursesPanel() {
  const { ctx, error } = useLoad(loadCourses, "cs");
  if (!ctx) {
    return (
      <>
        <ErrorNote error={error} />
        <p className="empty">Loading…</p>
      </>
    );
  }
  return <CoursesBody ctx={ctx} />;
}

function CoursesBody({ ctx }: { ctx: Ctx<Course[]> }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const { ask, dialog } = useConfirm();
  const courses = ctx.data;

  function changeStatus(c: Course, status: string) {
    ctx.edit((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)));
    setCourseStatus(c.id, status).catch(ctx.fail);
  }

  function oneMoreLesson(c: Course) {
    if (c.lessons_done >= c.lessons_total) return;
    ctx.edit((list) => list.map((x) => (x.id === c.id ? { ...x, lessons_done: x.lessons_done + 1 } : x)));
    addCourseLesson(c).catch(ctx.fail);
  }

  async function remove(c: Course) {
    if (!(await ask("Delete this course from your tracker?", "Delete"))) return;
    ctx.edit((list) => list.filter((x) => x.id !== c.id));
    deleteCourse(c.id).catch(ctx.fail);
  }

  return (
    <Card
      eyebrow="Courses"
      title="Monthly courses"
      right={
        <button type="button" className="wbtn soft small" onClick={() => setAdding(true)}>
          + Add course
        </button>
      }
    >
      <ul className="list">
        {courses.map((c) => {
          const statusValue = (COURSE_STATUS as readonly string[]).includes(c.status) ? c.status : "Not started";
          return (
            <li key={c.id} className="item course-item">
              <span className="grow">
                <strong>{c.name}</strong>
                <br />
                <span className="small muted">
                  {c.platform || "Platform not set"} · {c.lessons_done}/{c.lessons_total} lessons
                  {c.certificate ? " · certificate earned" : ""}
                  {c.started_on ? ` · started ${fmtDay(c.started_on)}` : ""}
                </span>
                <div className="bar" style={{ marginTop: 8 }}>
                  <span style={{ width: `${pct(c.lessons_done, c.lessons_total)}%` }} />
                </div>
              </span>
              <div className="course-controls">
                <select
                  className="winput"
                  style={{ width: "auto" }}
                  aria-label={`Status for ${c.name}`}
                  value={statusValue}
                  onChange={(e) => changeStatus(c, e.target.value)}
                >
                  {COURSE_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="button" className="wbtn soft small" disabled={c.lessons_done >= c.lessons_total} onClick={() => oneMoreLesson(c)}>
                  +1 lesson
                </button>
                <button type="button" className="wbtn ghost small" onClick={() => setEditing(c)}>
                  Edit
                </button>
                <button type="button" className="wbtn danger small" onClick={() => remove(c)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
        {courses.length === 0 && <li className="empty">Add a course with its platform and lesson count. You can add more at any time.</li>}
      </ul>

      {adding && (
        <FormModal
          title="Add a course"
          fields={courseFields(null)}
          submit="Add course"
          onClose={() => setAdding(false)}
          onSave={async (v) => {
            await addCourse(courseValues(v));
            ctx.reload();
          }}
        />
      )}
      {editing && (
        <FormModal
          title="Edit course"
          fields={courseFields(editing)}
          submit="Save course"
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await updateCourse(editing.id, courseValues(v));
            ctx.reload();
          }}
        />
      )}
      {dialog}
    </Card>
  );
}
