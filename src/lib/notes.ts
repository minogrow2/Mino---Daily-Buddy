// Goal notes: the saved scrapbook pages, the note being written (a draft), and their photos.
// Everything is stored in Supabase, so notes and photos show on every device.
import { createClient } from "@/lib/supabase/client";

export type GoalKey = "trading" | "ai" | "glow" | "tech" | "money" | "reading" | "cs";
export type Note = { id: string; html: string; pinned: boolean; created_at: string; updated_at: string; photos: string[] };
export type Draft = { html: string; photoIds: string[]; editId: string | null };

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Plain text of some rich text HTML, for snippets and empty checks. */
export function plainOf(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").replace(/\s+/g, " ").trim();
}
export const richIsEmpty = (html: string) => plainOf(html) === "";

export const EMPTY_DRAFT: Draft = { html: "", photoIds: [], editId: null };

/** Saved notes for one goal, newest first, each with its photo ids in order. */
export async function loadNotes(goal: GoalKey): Promise<Note[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("goal_notes")
    .select("id,html,pinned,created_at,updated_at")
    .eq("goal_id", goal)
    .order("created_at", { ascending: false });
  fail(error);
  const notes = (data ?? []) as Omit<Note, "photos">[];
  if (!notes.length) return [];
  const { data: links, error: e2 } = await sb
    .from("goal_note_photos")
    .select("note_id,media_id,position")
    .in("note_id", notes.map((n) => n.id))
    .order("position");
  fail(e2);
  const byNote = new Map<string, string[]>();
  for (const l of (links ?? []) as { note_id: string; media_id: string }[]) {
    byNote.set(l.note_id, [...(byNote.get(l.note_id) ?? []), l.media_id]);
  }
  return notes.map((n) => ({ ...n, photos: byNote.get(n.id) ?? [] }));
}

export async function loadDraft(goal: GoalKey): Promise<Draft> {
  const { data, error } = await createClient()
    .from("goal_drafts")
    .select("html,edit_note_id,photo_ids")
    .eq("goal_id", goal)
    .maybeSingle();
  fail(error);
  if (!data) return EMPTY_DRAFT;
  return { html: data.html ?? "", editId: data.edit_note_id ?? null, photoIds: (data.photo_ids as string[]) ?? [] };
}

/** Saves what is being written. An empty draft removes the row. */
export async function saveDraft(goal: GoalKey, d: Draft): Promise<void> {
  const sb = createClient();
  if (!d.html && !d.photoIds.length && !d.editId) {
    fail((await sb.from("goal_drafts").delete().eq("goal_id", goal)).error);
    return;
  }
  fail(
    (
      await sb.from("goal_drafts").upsert(
        { goal_id: goal, html: d.html, edit_note_id: d.editId, photo_ids: d.photoIds, updated_at: new Date().toISOString() },
        { onConflict: "user_id,goal_id" },
      )
    ).error,
  );
}

async function setPhotos(noteId: string, photoIds: string[]) {
  const sb = createClient();
  fail((await sb.from("goal_note_photos").delete().eq("note_id", noteId)).error);
  if (!photoIds.length) return;
  fail(
    (
      await sb.from("goal_note_photos").insert(
        photoIds.map((media_id, position) => ({ note_id: noteId, media_id, position })),
      )
    ).error,
  );
}

export async function createNote(goal: GoalKey, html: string, photoIds: string[]): Promise<string> {
  const id = crypto.randomUUID();
  fail((await createClient().from("goal_notes").insert({ id, goal_id: goal, html, pinned: false })).error);
  await setPhotos(id, photoIds);
  return id;
}

export async function updateNote(id: string, html: string, photoIds: string[]): Promise<void> {
  fail((await createClient().from("goal_notes").update({ html, updated_at: new Date().toISOString() }).eq("id", id)).error);
  await setPhotos(id, photoIds);
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  fail((await createClient().from("goal_notes").update({ pinned }).eq("id", id)).error);
}

export async function deleteNote(id: string): Promise<void> {
  fail((await createClient().from("goal_notes").delete().eq("id", id)).error);
}
