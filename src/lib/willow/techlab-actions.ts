// Writes for the Tech Lab. Each one saves to Supabase and throws on error.
// Screenshots are removed only after the rows that point to them are gone (media is restricted by its links).
import { createClient } from "@/lib/supabase/client";
import { deleteMedia } from "@/lib/media";
import type { TechStage } from "./techlab";

export type ProjectFields = { title: string; area: string; status: TechStage; repo: string; notes: string; problems: string };

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function createProject(f: ProjectFields): Promise<void> {
  fail((await createClient().from("projects").insert({ id: crypto.randomUUID(), ...f })).error);
}

export async function updateProject(id: string, f: ProjectFields): Promise<void> {
  fail((await createClient().from("projects").update(f).eq("id", id)).error);
}

export async function setProjectStage(id: string, status: TechStage): Promise<void> {
  fail((await createClient().from("projects").update({ status }).eq("id", id)).error);
}

/** Removes screenshots that nothing points to any more. A file that cannot be removed is left behind quietly. */
export async function removePhotos(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteMedia(id).catch(() => {})));
}

/** Deletes a project. Its logs and their photo links go with it (database cascade), then the screenshots are removed. */
export async function deleteProject(id: string, photoIds: string[]): Promise<void> {
  fail((await createClient().from("projects").delete().eq("id", id)).error);
  await removePhotos(photoIds);
}

/** Saves a log entry (created or edited) and its screenshots in order. Removed screenshots are deleted afterwards. */
export async function saveProjectLog(l: {
  id: string;
  projectId: string;
  day: string;
  html: string;
  text: string;
  photoIds: string[];
  removedPhotoIds: string[];
}): Promise<void> {
  const sb = createClient();
  fail(
    (
      await sb
        .from("project_logs")
        .upsert({ id: l.id, project_id: l.projectId, day: l.day, text: l.text, html: l.html }, { onConflict: "user_id,id" })
    ).error,
  );
  fail((await sb.from("project_log_photos").delete().eq("log_id", l.id)).error);
  if (l.photoIds.length) {
    fail(
      (
        await sb
          .from("project_log_photos")
          .insert(l.photoIds.map((media_id, position) => ({ log_id: l.id, media_id, position })))
      ).error,
    );
  }
  await removePhotos(l.removedPhotoIds);
}

export async function deleteProjectLog(id: string, photoIds: string[]): Promise<void> {
  fail((await createClient().from("project_logs").delete().eq("id", id)).error);
  await removePhotos(photoIds);
}
