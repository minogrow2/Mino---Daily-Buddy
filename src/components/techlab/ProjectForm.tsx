"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import { createProject, updateProject } from "@/lib/willow/techlab-actions";
import { TECH_AREAS, TECH_STAGES, type TechProject, type TechStage } from "@/lib/willow/techlab";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Add or edit a project: name, area, stage, repository link, notes and technical problems. */
export function ProjectForm({
  project,
  onSaved,
  onClose,
}: {
  project: TechProject | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [area, setArea] = useState(project?.area || TECH_AREAS[0]);
  const [status, setStatus] = useState<TechStage>(project?.status ?? "Idea");
  const [repo, setRepo] = useState(project?.repo ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [problems, setProblems] = useState(project?.problems ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const areaOptions: readonly string[] = (TECH_AREAS as readonly string[]).includes(area) ? TECH_AREAS : [area, ...TECH_AREAS];

  async function save(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) {
      setErr("Give the project a name.");
      return;
    }
    const link = repo.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      setErr("The repository link should start with https://.");
      return;
    }
    setBusy(true);
    setErr(null);
    const fields = {
      title: name.slice(0, 200),
      area,
      status,
      repo: link.slice(0, 300),
      notes: notes.trim().slice(0, 2000),
      problems: problems.trim().slice(0, 1000),
    };
    try {
      if (project) await updateProject(project.id, fields);
      else await createProject(fields);
      onSaved();
    } catch (er) {
      setErr(errorText(er));
      setBusy(false);
    }
  }

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        <label>
          Project
          <input className="winput" value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Area
          <select className="winput" value={area} onChange={(e) => setArea(e.target.value)}>
            {areaOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select className="winput" value={status} onChange={(e) => setStatus(TECH_STAGES.find((s) => s === e.target.value) ?? status)}>
            {TECH_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Code repository link <span className="small muted">optional</span>
          <input className="winput" type="url" placeholder="https://" maxLength={300} value={repo} onChange={(e) => setRepo(e.target.value)} />
        </label>
        <label>
          Description and notes
          <textarea className="winput" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label>
          Technical problems
          <textarea className="winput" rows={2} maxLength={1000} value={problems} onChange={(e) => setProblems(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="actions">
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : "Save project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
