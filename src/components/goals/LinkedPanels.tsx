"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { loadReadingSummary, loadTechSummary } from "@/lib/willow/goals";
import { useLoad } from "./useLoad";

const loading = (error: string | null) => (
  <>
    <ErrorNote error={error} />
    <p className="empty">Loading…</p>
  </>
);

/** Tech projects on the Tech Development page. The projects themselves are edited in the Tech Lab. */
export function TechProjectsPanel() {
  const { ctx, error } = useLoad(loadTechSummary, "tech");
  if (!ctx) return loading(error);
  return (
    <Card eyebrow="Linked" title="Tech projects" right={<Link className="wbtn soft small" href="/techlab">Open Tech Lab</Link>}>
      {ctx.data.length ? (
        <ul className="list">
          {ctx.data.map((p) => (
            <li key={p.id} className="item">
              <span className="grow">{p.title}</span>
              <span className="tag">{p.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">Your projects live in the Tech Lab.</div>
      )}
    </Card>
  );
}

/** The reading library on the Watch and Read page: counts only, the library itself is edited on its own page. */
export function ReadingPanel() {
  const { ctx, error } = useLoad(loadReadingSummary, "reading");
  if (!ctx) return loading(error);
  const items = ctx.data;
  const completed = items.filter((x) => x.status === "Completed").length;
  return (
    <Card eyebrow="Library" title="Watch and read" right={<Link className="wbtn soft small" href="/library">Open library</Link>}>
      <p className="small muted">
        {items.length} items saved. {completed} completed. Track meaningful content, not hours.
      </p>
    </Card>
  );
}
