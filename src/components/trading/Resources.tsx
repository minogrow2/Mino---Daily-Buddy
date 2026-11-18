"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal, ErrorNote, useConfirm } from "@/components/ui/Modal";
import { newId, safeUrl, type Resource } from "@/lib/trading/types";

export function Resources() {
  const [items, setItems] = useState<Resource[] | null>(null);
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("resources")
      .select("id,title,url,created_at")
      .eq("goal_id", "trading")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as Resource[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
  }, [load]);

  async function remove(r: Resource) {
    if (!(await ask(`Delete the resource “${r.title}”?`))) return;
    const { error } = await createClient().from("resources").delete().eq("id", r.id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <section className="glass p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Resources</h2>
        <button className="btn btn-sage btn-sm" onClick={() => setEditing("new")}>+ Resource</button>
      </div>
      <div className="mt-3"><ErrorNote error={error} /></div>
      {items === null ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No resources yet. Save links to charts, courses and videos.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((r) => {
            const href = safeUrl(r.url);
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2" style={{ background: "var(--surface)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted">{r.url || "No link"}</p>
                </div>
                {href && (
                  <a className="btn btn-sm" href={href} target="_blank" rel="noopener noreferrer">Open</a>
                )}
                <button className="btn btn-sm" onClick={() => setEditing(r)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>Delete</button>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <ResourceForm
          resource={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {dialog}
    </section>
  );
}

function ResourceForm({ resource, onClose, onSaved }: { resource: Resource | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(resource?.title ?? "");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Give the resource a title.");
    let link = url.trim();
    if (link && !/^[a-z][a-z0-9+.-]*:/i.test(link)) link = "https://" + link;
    if (link && !safeUrl(link)) return setError("Enter a valid http(s) link.");
    setBusy(true);
    const sb = createClient();
    const row = { title: t, url: link };
    const { error } = resource
      ? await sb.from("resources").update(row).eq("id", resource.id)
      : await sb.from("resources").insert({ id: newId(), goal_id: "trading", ...row });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }
  return (
    <Modal title={resource ? "Edit resource" : "New resource"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="rs-t">Title</label>
          <input id="rs-t" className="input" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="rs-u">Link</label>
          <input id="rs-u" className="input" value={url} maxLength={2000} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
        </div>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
