// Writes for the Savings page. Each one saves to Supabase and throws if the save fails.
import { createClient } from "@/lib/supabase/client";
import type { SavingsEntry } from "./savings";

const newId = () => crypto.randomUUID();
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export type SavingsInput = Omit<SavingsEntry, "id">;

export async function addSavingsEntry(row: SavingsInput): Promise<SavingsEntry> {
  const full = { id: newId(), ...row };
  fail((await createClient().from("savings_entries").insert(full)).error);
  return full;
}

export async function updateSavingsEntry(id: string, patch: SavingsInput) {
  fail((await createClient().from("savings_entries").update(patch).eq("id", id)).error);
}

export async function deleteSavingsEntry(id: string) {
  fail((await createClient().from("savings_entries").delete().eq("id", id)).error);
}
