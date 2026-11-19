// Reads and reference lists for the Library page: watch-and-read items, knowledge notes and the wishlist.
import { createClient } from "@/lib/supabase/client";

/** Categories for watch-and-read items, as in the legacy app. */
export const LIB_CATS = ["YouTube", "Documentary", "Technology", "Finance", "AI", "Cybersecurity", "Book", "Article", "Entertainment"] as const;
export const LIB_STATUS = ["Planned", "In progress", "Completed"] as const;
export const KNOWLEDGE_TYPES: [string, string][] = [
  ["Note", "Note"],
  ["Link", "Link"],
  ["Snippet", "Code snippet"],
  ["Idea", "Idea"],
  ["AI tool", "Useful AI tool"],
  ["Research", "Research"],
];
export const WISH_KINDS = ["Clothes", "Technology", "Books", "Places", "Skills", "Experiences"] as const;

export type LibraryKind = "content" | "knowledge";
export type LibraryItem = {
  id: string;
  kind: LibraryKind;
  title: string;
  category: string;
  status: string;
  url: string;
  note: string;
  type: string;
  body: string;
  tags: string[];
};
export type WishItem = { id: string; title: string; kind: string; price: number | null; note: string; bought: boolean };

/** Only http and https links are opened from a saved item. Anything else is shown as plain text. */
export const safeHref = (url: string) => (/^https?:\/\//i.test(url.trim()) ? url.trim() : null);

/** Every library item (watch-and-read and knowledge), in the order they were saved. */
export async function loadLibrary(): Promise<LibraryItem[]> {
  const { data, error } = await createClient()
    .from("library_items")
    .select("id,kind,title,category,status,url,note,type,body,tags")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LibraryItem[];
}

/** The wishlist, in the order it was added. */
export async function loadWishlist(): Promise<WishItem[]> {
  const { data, error } = await createClient()
    .from("wishlist_items")
    .select("id,title,kind,price,note,bought")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WishItem[];
}
