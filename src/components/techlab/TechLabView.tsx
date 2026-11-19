"use client";

import { useEffect, useState } from "react";
import "@/app/willow-techlab.css";
import { Icon } from "@/components/ui/Icon";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { fmtDay, todayYMD } from "@/lib/dates";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { deleteProject, deleteProjectLog, setProjectStage } from "@/lib/willow/techlab-actions";
import { TECH_STAGES, loadTechLab, type TechLog, type TechProject } from "@/lib/willow/techlab";
import { LogEditor } from "./LogEditor";
import { ProjectDialog } from "./ProjectDialog";
import { ProjectForm } from "./ProjectForm";

const TECH_TONES = ["pink", "butter", "sage"] as const;
const TECH_ICON = '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>';

type Editing =
  | { kind: "project"; project: TechProject | null }
  | { kind: "log"; projectId: string; projectTitle: string; log: TechLog | null; day: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
/** The first screenshot of the newest log that has one. */
const coverOf = (p: TechProject) => p.logs.find((l) => l.photos.length)?.photos[0] ?? null;
const allPhotos = (p: TechProject) => p.logs.flatMap((l) => l.photos);

/** The Tech Lab: projects in five stage columns. Open a project to read and write its log. */
export function TechLabView() {
  const [projects, setProjects] = useState<TechProject[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const { ask, dialog: confirm } = useConfirm();

  const reload = () => setTick((t) => t + 1);
  const failed = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };

  useEffect(() => {
    let live = true;
    loadTechLab()
      .then((r) => {
        if (live) {
          setProjects(r);
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  const covers = (projects ?? []).map(coverOf).filter((x): x is string => !!x);
  const urls = usePhotoUrls(covers);
  const open = projects?.find((p) => p.id === openId) ?? null;

  function moveStage(p: TechProject, dir: number) {
    const i = TECH_STAGES.indexOf(p.status) + dir;
    if (i < 0 || i >= TECH_STAGES.length) return;
    const status = TECH_STAGES[i];
    setProjects((list) => list && list.map((x) => (x.id === p.id ? { ...x, status } : x)));
    setProjectStage(p.id, status).catch(failed);
  }

  async function removeProject(p: TechProject) {
    if (!(await ask("Delete this project, its log and its screenshots?"))) return;
    setOpenId(null);
    try {
      await deleteProject(p.id, allPhotos(p));
      reload();
    } catch (e) {
      failed(e);
    }
  }

  async function removeLog(l: TechLog) {
    if (!(await ask("Delete this log entry and its screenshots?"))) return;
    try {
      await deleteProjectLog(l.id, l.photos);
      reload();
    } catch (e) {
      failed(e);
    }
  }

  return (
    <div className="grid">
      <div className="row-inline" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Goal 04 · Idea → Planning → In Progress → Testing → Completed</div>
          <h1>Tech Lab</h1>
        </div>
        <button type="button" className="wbtn primary small" onClick={() => setEditing({ kind: "project", project: null })}>
          + New project
        </button>
      </div>
      <ErrorNote error={err} />

      {projects ? (
        <div className="table-scroll">
          <div className="tech-board">
            {TECH_STAGES.map((stage, si) => {
              const items = projects.filter((p) => p.status === stage);
              return (
                <section key={stage} className="tech-col" aria-label={stage}>
                  <div className="tech-col-head">
                    <strong>{stage}</strong>
                    <span className="tech-count">{items.length}</span>
                  </div>
                  {items.length ? (
                    items.map((p, i) => (
                      <ProjectCard
                        key={p.id}
                        p={p}
                        i={i}
                        si={si}
                        urls={urls}
                        onMove={(dir) => moveStage(p, dir)}
                        onOpen={() => setOpenId(p.id)}
                      />
                    ))
                  ) : (
                    <p className="small muted tech-empty">Nothing here yet.</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="empty">Opening the Tech Lab…</p>
      )}

      <p className="small muted">Open a project to read its log. Screenshots and repository links are kept with each project.</p>

      {open && (
        <ProjectDialog
          project={open}
          onClose={() => setOpenId(null)}
          onMove={(dir) => moveStage(open, dir)}
          onEdit={() => setEditing({ kind: "project", project: open })}
          onDelete={() => removeProject(open)}
          onNewLog={() => setEditing({ kind: "log", projectId: open.id, projectTitle: open.title, log: null, day: todayYMD() })}
          onEditLog={(l) => setEditing({ kind: "log", projectId: open.id, projectTitle: open.title, log: l, day: l.day })}
          onDeleteLog={removeLog}
        />
      )}
      {editing?.kind === "project" && (
        <ProjectForm
          project={editing.project}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "log" && (
        <LogEditor
          projectId={editing.projectId}
          projectTitle={editing.projectTitle}
          log={editing.log}
          day={editing.day}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {confirm}
    </div>
  );
}

function ProjectCard({
  p,
  i,
  si,
  urls,
  onMove,
  onOpen,
}: {
  p: TechProject;
  i: number;
  si: number;
  urls: Record<string, string>;
  onMove: (dir: number) => void;
  onOpen: () => void;
}) {
  const cover = coverOf(p);
  const n = p.logs.length;
  const last = TECH_STAGES.length - 1;
  return (
    <article className={`tech-card tone-${TECH_TONES[i % 3]} tilt-${i % 4}`}>
      {cover && urls[cover] ? (
        <div className="tech-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[cover]} alt={`Screenshot of ${p.title}`} loading="lazy" />
        </div>
      ) : (
        <div className="tech-cover tech-cover-empty" aria-hidden="true">
          <Icon body={TECH_ICON} className="mi" />
        </div>
      )}
      <h3 className="tech-title">{p.title}</h3>
      <div className="tech-meta">
        <span className="tech-area">{p.area}</span>
        <span className="tech-dots" aria-label={`Stage ${si + 1} of ${TECH_STAGES.length}`}>
          {TECH_STAGES.map((s, k) => (
            <i key={s} className={k <= si ? "on" : undefined} />
          ))}
        </span>
      </div>
      <div className="tech-foot">
        <span>
          {n} {n === 1 ? "log" : "logs"}
        </span>
        <span>{p.logs[0] ? fmtDay(p.logs[0].day, { month: "short", day: "numeric" }) : "No logs yet"}</span>
      </div>
      <div className="tech-actions">
        {si > 0 && (
          <button type="button" className="wbtn ghost small" onClick={() => onMove(-1)} aria-label="Move back">
            ←
          </button>
        )}
        {si < last && (
          <button type="button" className="wbtn ghost small" onClick={() => onMove(1)} aria-label={`Move to ${TECH_STAGES[si + 1]}`}>
            →
          </button>
        )}
        <button type="button" className="wbtn primary small tech-open" onClick={onOpen}>
          Open
        </button>
      </div>
    </article>
  );
}
