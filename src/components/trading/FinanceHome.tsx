"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtDay, todayYMD, addDays, ymd } from "@/lib/dates";
import { ErrorNote } from "@/components/ui/Modal";
import { Heatmap } from "./Heatmap";
import { Milestones } from "./Milestones";
import { Resources } from "./Resources";
import { Notes } from "./Notes";
import { NavCards } from "./NavCards";
import { ActivityForm, ActivityLogModal } from "./ActivityLog";
import type { Activity, DayItem, Milestone } from "@/lib/trading/types";

type DocLite = { id: string; kind: string; title: string; created_at: string; updated_at: string };

export function FinanceHome() {
  const [acts, setActs] = useState<Activity[] | null>(null);
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [ms, setMs] = useState<Milestone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const sb = createClient();
    const [a, d, m] = await Promise.all([
      sb.from("activities").select("id,day,category,title,minutes,note").eq("goal_id", "trading").eq("me_key", "").order("day", { ascending: false }).limit(5000),
      sb.from("trading_documents").select("id,kind,title,created_at,updated_at"),
      sb.from("milestones").select("id,title,horizon,due_day,done,created_at").eq("goal_id", "trading"),
    ]);
    const err = a.error ?? d.error ?? m.error;
    if (err) return setError(err.message);
    setError(null);
    setActs(a.data as Activity[]);
    setDocs(d.data as DocLite[]);
    setMs(m.data as Milestone[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
  }, [load]);

  const { byDay, last, last30Days, byCat } = useMemo(() => {
    const byDay: Record<string, DayItem[]> = {};
    // Nothing is loaded during prerender; "today" is only read on the client once data exists.
    if (acts === null) return { byDay, last: null as string | null, last30Days: 0, byCat: {} as Record<string, number> };
    const push = (day: string, it: DayItem) => (byDay[day] ??= []).push(it);
    (acts ?? []).forEach((a) => push(a.day, { kind: "activity", title: a.title, detail: [a.category, a.minutes ? `${a.minutes} min` : ""].filter(Boolean).join(" · ") }));
    // Writing or editing a document counts as a documenting contribution for that day.
    docs.forEach((d) => {
      const c = ymd(d.created_at);
      const u = ymd(d.updated_at);
      const label = d.kind === "backtest" ? "Backtesting document" : "Concepts document";
      push(c, { kind: "document", title: d.title, detail: `${label} created` });
      if (u !== c) push(u, { kind: "document", title: d.title, detail: `${label} edited` });
    });
    const days = Object.keys(byDay).sort();
    const cut = addDays(todayYMD(), -29);
    const byCat: Record<string, number> = {};
    (acts ?? []).forEach((a) => (byCat[a.category] = (byCat[a.category] ?? 0) + 1));
    return { byDay, last: days.at(-1) ?? null, last30Days: days.filter((d) => d >= cut).length, byCat };
  }, [acts, docs]);

  const done = ms.filter((m) => m.done).length;
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));

  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <header className="glass p-6">
          <p className="text-sm text-muted">My Goals → Finance Trading</p>
          <h1 className="font-display mt-1 text-4xl">Finance Trading</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Learn financial markets, build and test strategies, and keep a calm record of the work. Learning, documenting and backtesting all count as progress.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Milestone progress" value={ms.length ? `${pct}%` : "—"} sub={ms.length ? `${done} of ${ms.length}` : "No milestones yet"} />
            <Stat label="Completed milestones" value={String(done)} />
            <Stat label="Recorded activities" value={acts ? String(acts.length) : "…"} sub={`${last30Days} active day${last30Days === 1 ? "" : "s"} in the last 30`} />
            <Stat label="Last activity" value={last ? fmtDay(last, { month: "short", day: "numeric" }) : "—"} sub={last ? fmtDay(last, { year: "numeric" }) : "Nothing yet"} />
          </div>
          <div className="mt-4"><ErrorNote error={error} /></div>
        </header>

        <section className="glass p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl">Trading activity</h2>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={() => setLogOpen(true)}>View Activity Log</button>
              <button className="btn btn-sage btn-sm" onClick={() => setAdding(true)}>+ Log activity</button>
            </div>
          </div>
          {acts === null ? <p className="py-8 text-center text-sm text-muted">Loading…</p> : <Heatmap byDay={byDay} />}
          {cats.length > 0 && (
            <div className="mt-5 grid gap-x-8 gap-y-1.5 sm:grid-cols-2" aria-label="Activities by category">
              {cats.map(([c, n]) => (
                <div key={c} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 truncate">{c}</span>
                  <div className="bar flex-1"><i style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs text-muted">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <NavCards />

        <Milestones items={ms} onChange={load} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Notes />
          <Resources />
        </div>
      </main>
      {logOpen && <ActivityLogModal activities={acts ?? []} onClose={() => setLogOpen(false)} onChange={load} />}
      {adding && <ActivityForm activity={null} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line p-3" style={{ background: "var(--sage-fill)" }}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-3xl leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
