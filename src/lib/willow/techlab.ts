// Tech Lab: projects, their stages, and their progress logs with screenshots. Everything is stored in Supabase.
import { createClient } from "@/lib/supabase/client";

export const TECH_STAGES = ["Idea", "Planning", "In Progress", "Testing", "Completed"] as const;
export type TechStage = (typeof TECH_STAGES)[number];

/** The areas from the legacy Tech Lab. */
export const TECH_AREAS = [
  "Website",
  "Productivity app",
  "Digital journal",
  "Home lab",
  "Linux",
  "AI agent",
  "Reverse engineering",
  "Cybersecurity",
  "Programming challenge",
] as const;

/** One progress log entry. `photos` are media ids in order. */
export type TechLog = { id: string; day: string; text: string; html: string; photos: string[] };

/** A project as the page shows it. Logs are newest first. */
export type TechProject = {
  id: string;
  title: string;
  area: string;
  status: TechStage;
  repo: string;
  notes: string;
  problems: string;
  logs: TechLog[];
};

type ProjectRow = { id: string; title: string; area: string; status: string; repo: string; notes: string; problems: string };
type LogRow = { id: string; project_id: string; day: string; text: string; html: string };
type LinkRow = { log_id: string; media_id: string };

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Every project with its logs and their screenshots. Projects keep the order they were added. */
export async function loadTechLab(): Promise<TechProject[]> {
  const sb = createClient();
  const [pr, lr, kr] = await Promise.all([
    sb.from("projects").select("id,title,area,status,repo,notes,problems").order("created_at", { ascending: true }),
    sb.from("project_logs").select("id,project_id,day,text,html").order("created_at", { ascending: false }),
    sb.from("project_log_photos").select("log_id,media_id").order("position", { ascending: true }),
  ]);
  fail(pr.error);
  fail(lr.error);
  fail(kr.error);

  const photos = new Map<string, string[]>();
  for (const k of (kr.data ?? []) as LinkRow[]) photos.set(k.log_id, [...(photos.get(k.log_id) ?? []), k.media_id]);

  const logs = new Map<string, TechLog[]>();
  for (const l of (lr.data ?? []) as LogRow[]) {
    const entry: TechLog = { id: l.id, day: l.day, text: l.text, html: l.html, photos: photos.get(l.id) ?? [] };
    logs.set(l.project_id, [...(logs.get(l.project_id) ?? []), entry]);
  }

  return ((pr.data ?? []) as ProjectRow[]).map((p) => ({
    ...p,
    status: p.status as TechStage,
    logs: logs.get(p.id) ?? [],
  }));
}
