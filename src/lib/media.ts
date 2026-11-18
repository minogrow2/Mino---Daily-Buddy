import { createClient } from "@/lib/supabase/client";

const OK = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_EDGE = 2400;
const MAX_BYTES = 10 * 1024 * 1024;

/** Shrinks very large screenshots before upload (GIFs are left alone). */
async function prepare(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2 * 1024 * 1024) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Uploads an image to the private "media" bucket and records it. Returns the media id. */
export async function uploadImage(file: File): Promise<string> {
  if (!OK.includes(file.type)) throw new Error("Only JPEG, PNG, WebP or GIF images can be added.");
  if (file.size > MAX_BYTES * 2) throw new Error("That image is too large (limit about 20 MB).");
  const body = await prepare(file);
  if (body.size > MAX_BYTES) throw new Error("That image is still over 10 MB after shrinking.");
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("You are signed out. Sign in again to add images.");
  const id = crypto.randomUUID();
  const ext = body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : body.type === "image/gif" ? "gif" : "jpg";
  const path = `${user.id}/${id}.${ext}`;
  const up = await sb.storage.from("media").upload(path, body, { contentType: body.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const ins = await sb.from("media").insert({ id, storage_path: path, mime_type: body.type, byte_size: body.size });
  if (ins.error) {
    await sb.storage.from("media").remove([path]);
    throw new Error(ins.error.message);
  }
  return id;
}

/** Fresh short-lived URLs for private images, keyed by media id. */
export async function signedUrls(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const sb = createClient();
  const { data: rows } = await sb.from("media").select("id,storage_path").in("id", unique);
  if (!rows?.length) return {};
  const { data } = await sb.storage.from("media").createSignedUrls(
    rows.map((r) => r.storage_path),
    60 * 60 * 6,
  );
  const out: Record<string, string> = {};
  rows.forEach((r) => {
    const hit = data?.find((d) => d.path === r.storage_path);
    if (hit?.signedUrl) out[r.id] = hit.signedUrl;
  });
  return out;
}

/* Editor JSON stores only media ids. URLs are filled in when a document is opened and stripped when saved. */
type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[] };

export function mediaIdsIn(node: Node, acc: string[] = []): string[] {
  if (node.type === "image" && typeof node.attrs?.mediaId === "string") acc.push(node.attrs.mediaId);
  node.content?.forEach((c) => mediaIdsIn(c, acc));
  return acc;
}
export function mapImages<T extends Node>(node: T, fn: (attrs: Record<string, unknown>) => Record<string, unknown>): T {
  const next: Node = { ...node };
  if (node.type === "image" && node.attrs?.mediaId) next.attrs = fn({ ...node.attrs });
  if (node.content) next.content = node.content.map((c) => mapImages(c, fn));
  return next as T;
}
export const hydrate = <T extends Node>(doc: T, urls: Record<string, string>): T =>
  mapImages(doc, (a) => ({ ...a, src: urls[a.mediaId as string] ?? "" }));
export const dehydrate = <T extends Node>(doc: T): T => mapImages(doc, (a) => ({ ...a, src: "" }));
