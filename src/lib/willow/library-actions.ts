// Writes for the Library page. Each one saves to Supabase and throws if the save fails.
import { createClient } from "@/lib/supabase/client";
import type { LibraryItem, LibraryKind, WishItem } from "./library";

const newId = () => crypto.randomUUID();
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** The fields a watch-and-read item or a knowledge note carries. Fields the kind does not use are left at their stored blank. */
export type LibraryFields = Partial<Omit<LibraryItem, "id" | "kind">>;

export async function addLibraryItem(kind: LibraryKind, fields: LibraryFields): Promise<LibraryItem> {
  const row = { id: newId(), kind, title: "", category: "", status: "", url: "", note: "", type: "", body: "", tags: [], ...fields };
  fail((await createClient().from("library_items").insert(row)).error);
  return row as LibraryItem;
}

export async function updateLibraryItem(id: string, patch: LibraryFields) {
  fail((await createClient().from("library_items").update(patch).eq("id", id)).error);
}

export async function deleteLibraryItem(id: string) {
  fail((await createClient().from("library_items").delete().eq("id", id)).error);
}

export type WishInput = Omit<WishItem, "id">;

export async function addWishlistItem(row: WishInput): Promise<WishItem> {
  const full = { id: newId(), ...row };
  fail((await createClient().from("wishlist_items").insert(full)).error);
  return full;
}

export async function setWishlistBought(id: string, bought: boolean) {
  fail((await createClient().from("wishlist_items").update({ bought }).eq("id", id)).error);
}

export async function deleteWishlistItem(id: string) {
  fail((await createClient().from("wishlist_items").delete().eq("id", id)).error);
}
