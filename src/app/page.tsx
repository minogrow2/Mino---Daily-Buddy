import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function Status() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proves the database + RLS are wired: counts only this user's rows.
  const { count, error } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true });

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-6 shadow-soft">
      <p>
        Signed in as <strong>{user?.email}</strong>
      </p>
      <p className="mt-2 text-sm text-muted">
        Database check: {error ? `error — ${error.message}` : `connected (${count ?? 0} habits)`}
      </p>
      <p className="mt-4 text-sm text-muted">
        Foundation is ready. Willow pages are ported next, then the Finance Trading makeover.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-4xl">Willow</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Status />
      </Suspense>
      <form action="/auth/signout" method="post">
        <button className="rounded-full border border-line px-4 py-2 text-sm">Sign out</button>
      </form>
    </main>
  );
}
