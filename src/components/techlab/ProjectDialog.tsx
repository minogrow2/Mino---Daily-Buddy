"use client";

import type { ReactNode } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { Modal } from "@/components/ui/Modal";
import { fmtDay } from "@/lib/dates";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { TECH_STAGES, type TechLog, type TechProject } from "@/lib/willow/techlab";

/** The project popup: stage, about, problems, repository, and the progress log with rich text and screenshots. */
export function ProjectDialog({
  project: p,
  onClose,
  onMove,
  onEdit,
  onDelete,
  onNewLog,
  onEditLog,
  onDeleteLog,
}: {
  project: TechProject;
  onClose: () => void;
  onMove: (dir: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onNewLog: () => void;
  onEditLog: (l: TechLog) => void;
  onDeleteLog: (l: TechLog) => void;
}) {
  const urls = usePhotoUrls(p.logs.flatMap((l) => l.photos));
  const si = TECH_STAGES.indexOf(p.status);
  const last = TECH_STAGES.length - 1;
  const n = p.logs.length;
  const repo = /^https?:\/\//i.test(p.repo) ? p.repo : "";

  return (
    <Modal title={p.title} eyebrow={p.area} onClose={onClose} wide>
      <div className="row-inline">
        <span className="tech-count">
          {n} {n === 1 ? "log" : "logs"}
        </span>
      </div>
      <div className="tech-steps" role="group" aria-label="Stage">
        {TECH_STAGES.map((s, k) => (
          <span key={s} className={`tech-step${k <= si ? " on" : ""}${k === si ? " now" : ""}`}>
            {s}
          </span>
        ))}
      </div>
      <div className="row-inline">
        {si > 0 && (
          <button type="button" className="wbtn ghost small" onClick={() => onMove(-1)}>
            ← {TECH_STAGES[si - 1]}
          </button>
        )}
        {si < last && (
          <button type="button" className="wbtn soft small" onClick={() => onMove(1)}>
            {TECH_STAGES[si + 1]} →
          </button>
        )}
      </div>

      {p.notes && <Sec title="About"><p className="tech-text">{p.notes}</p></Sec>}
      {p.problems && <Sec title="Technical problems"><p className="tech-text">{p.problems}</p></Sec>}
      {repo && (
        <p className="small">
          <a href={repo} target="_blank" rel="noopener noreferrer">
            Open the repository
          </a>
        </p>
      )}

      <section className="hist-sec">
        <div className="row-inline" style={{ justifyContent: "space-between" }}>
          <h3 className="day-note-title">Progress log</h3>
          <button type="button" className="wbtn primary small" onClick={onNewLog}>
            + New log entry
          </button>
        </div>
        {n ? (
          <div className="log-list">
            {p.logs.map((l, i) => (
              <LogCard key={l.id} l={l} i={i} urls={urls} onEdit={() => onEditLog(l)} onDelete={() => onDeleteLog(l)} />
            ))}
          </div>
        ) : (
          <p className="small muted">No entries yet. Write what you tried, what broke and what finally worked, and add a screenshot.</p>
        )}
      </section>

      <div className="actions scrap-actions">
        <button type="button" className="wbtn ghost small" onClick={onEdit}>
          Edit project
        </button>
        <button type="button" className="wbtn danger small" onClick={onDelete}>
          Delete project
        </button>
        <button type="button" className="wbtn primary small" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="hist-sec">
      <h3 className="day-note-title">{title}</h3>
      {children}
    </section>
  );
}

function LogCard({
  l,
  i,
  urls,
  onEdit,
  onDelete,
}: {
  l: TechLog;
  i: number;
  urls: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const when = fmtDay(l.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return (
    <article className={`log-entry tilt-${i % 4}`}>
      <div className="log-head">
        <span className="log-date">{when}</span>
        <span className="log-actions">
          <button type="button" className="wbtn ghost small" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="wbtn danger small" onClick={onDelete}>
            Delete
          </button>
        </span>
      </div>
      {l.html ? (
        <MiniEditor key={l.html} html={l.html} label={`Log from ${when}`} readOnly />
      ) : l.text ? (
        <p className="log-text tech-text">{l.text}</p>
      ) : null}
      {l.photos.length > 0 && (
        <div className="log-photos">
          {l.photos.map((id) => (
            <figure key={id} className="photo">
              {urls[id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[id]} alt={`Screenshot from ${when}`} loading="lazy" />
              )}
            </figure>
          ))}
        </div>
      )}
    </article>
  );
}
