"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorNote } from "@/components/ui/Modal";
import { todayYMD } from "@/lib/dates";
import { loadHome } from "@/lib/willow/data";
import type { HomeData } from "@/lib/willow/types";
import { Checklist } from "./Checklist";
import type { HomeCtx } from "./context";
import { Heatmap } from "./Heatmap";
import { Hero } from "./Hero";
import { MonthPreview } from "./MonthPreview";
import { MoodCard } from "./MoodCard";
import { Priorities } from "./Priorities";
import { QuickJournal } from "./QuickJournal";
import { Reflection } from "./Reflection";
import { Suggestions } from "./Suggestions";
import { WeeklyGoals } from "./WeeklyGoals";
import { WillowChat } from "./WillowChat";

/** The Home page, top to bottom, in the same order as the legacy app. */
export function HomeView() {
  // The month shown; null means the current month. Time is read only in the browser, never while the page is prerendered.
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const today = todayYMD();
      const next = await loadHome(today, month ?? today.slice(0, 7));
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your day. Try again.");
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and when the month changes; state is set after the await
    load();
  }, [load]);

  const edit = useCallback((fn: (d: HomeData) => HomeData) => setData((d) => (d ? fn(d) : d)), []);

  if (!data) {
    return (
      <div className="home-wrap" style={{ padding: "16px 0" }}>
        <ErrorNote error={error} />
        {!error && <div className="empty">Opening Willow…</div>}
      </div>
    );
  }

  const ctx: HomeCtx = { data, edit, reload: load };
  const shown = month ?? data.today.slice(0, 7);
  return (
    <div className="grid home">
      <Hero today={data.today} name={data.name} />
      <MoodCard ctx={ctx} />
      <div className="grid two">
        <Checklist ctx={ctx} />
        <Priorities ctx={ctx} />
      </div>
      <Heatmap today={data.today} version={version} />
      <WeeklyGoals ctx={ctx} />
      <div className="grid two">
        <MonthPreview ctx={ctx} month={shown} setMonth={setMonth} />
        <QuickJournal ctx={ctx} onSaved={() => setVersion((v) => v + 1)} />
      </div>
      <div className="grid two">
        <WillowChat ctx={ctx} />
        <div className="grid">
          <Reflection ctx={ctx} />
        </div>
      </div>
      <Suggestions ctx={ctx} />
    </div>
  );
}
