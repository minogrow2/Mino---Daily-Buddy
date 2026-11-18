import { Card } from "@/components/ui/Card";
import { minoTips } from "@/lib/willow/logic";
import type { HomeCtx } from "./context";

/** Willow’s suggestions for today. Suggestions only; nothing here is a judgment. */
export function Suggestions({ ctx }: { ctx: HomeCtx }) {
  const tips = minoTips(ctx.data);
  return (
    <Card eyebrow="For today" title="Willow’s suggestions" id="suggestions">
      <ul className="divide-y divide-[var(--line)]">
        {tips.map((tip) => (
          <li key={tip} className="py-2 text-sm">{tip}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Based on your checklist, tasks, mood and recent activity. Suggestions only; nothing is judged.
      </p>
    </Card>
  );
}
