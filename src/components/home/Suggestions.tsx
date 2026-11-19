import { Card } from "@/components/ui/Card";
import { minoTips } from "@/lib/willow/logic";
import type { HomeCtx } from "./context";

/** Willow’s suggestions for today. Suggestions only; nothing here is a judgment. */
export function Suggestions({ ctx }: { ctx: HomeCtx }) {
  const tips = minoTips(ctx.data);
  return (
    <Card id="suggestions" eyebrow="For today" title="Willow’s suggestions">
      <ul className="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {tips.map((tip) => (
          <li key={tip} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            {tip}
          </li>
        ))}
        {tips.length === 0 && (
          <li className="muted small" style={{ padding: "8px 0" }}>
            Nothing to suggest right now.
          </li>
        )}
      </ul>
      <p className="small muted" style={{ marginTop: 8 }}>
        Based on your checklist, tasks, mood and recent activity. Suggestions only; nothing is judged.
      </p>
    </Card>
  );
}
