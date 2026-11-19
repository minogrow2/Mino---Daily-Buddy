"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/Modal";
import type { GoalPageData, GoalResource } from "@/lib/willow/goals";
import { addResource, deleteResource, updateResource } from "@/lib/willow/goals-actions";
import type { GoalKey } from "@/lib/willow/constants";
import { FormModal, type FormField } from "./GoalDialogs";
import type { Ctx } from "./useLoad";

/** Only web links are opened from here. */
const isWebLink = (u: string) => /^https?:\/\//i.test(u);

/** Checks a saved link. Anything that is not a web address is refused. */
function cleanUrl(s: string) {
  const t = s.trim();
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error("Paste a full link that starts with https://");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("The link needs to start with https://");
  return t;
}

const fieldsFor = (r: GoalResource | null): FormField[] => [
  { name: "title", label: "Title", required: true, max: 120, value: r?.title ?? "" },
  { name: "url", label: "Link", type: "url", required: true, max: 500, placeholder: "https://", value: r?.url ?? "" },
];

/** Links, videos and books saved for this goal. Each one can be edited or deleted. */
export function GoalResources({ ctx, goal }: { ctx: Ctx<GoalPageData>; goal: GoalKey }) {
  const [editing, setEditing] = useState<GoalResource | "new" | null>(null);
  const { ask, dialog } = useConfirm();
  const res = ctx.data.resources;

  async function remove(id: string) {
    if (!(await ask("Delete this resource?"))) return;
    ctx.edit((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id) }));
    deleteResource(id).catch(ctx.fail);
  }

  return (
    <Card
      eyebrow="Links"
      title="Resources"
      right={
        <button type="button" className="wbtn soft small" onClick={() => setEditing("new")}>
          + Resource
        </button>
      }
    >
      <ul className="list">
        {res.map((r) => (
          <li key={r.id} className="item">
            {isWebLink(r.url) ? (
              <a className="grow" href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
            ) : (
              <span className="grow">{r.title}</span>
            )}
            <span className="goal-row-actions">
              <button type="button" className="wbtn ghost small" onClick={() => setEditing(r)}>
                Edit
              </button>
              <button type="button" className="wbtn danger small" onClick={() => remove(r.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
        {res.length === 0 && <li className="empty">Save links, videos, or books for this goal.</li>}
      </ul>
      {editing && (
        <FormModal
          title={editing === "new" ? "Add a resource" : "Edit resource"}
          fields={fieldsFor(editing === "new" ? null : editing)}
          submit={editing === "new" ? "Add resource" : "Save resource"}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const title = v.title.trim();
            const url = cleanUrl(v.url);
            if (editing === "new") await addResource(goal, title, url);
            else await updateResource(editing.id, title, url);
            ctx.reload();
          }}
        />
      )}
      {dialog}
    </Card>
  );
}
