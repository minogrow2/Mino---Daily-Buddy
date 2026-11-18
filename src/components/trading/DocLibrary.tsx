"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { fmtStamp } from "@/lib/dates";
import { Modal, ErrorNote, useConfirm } from "@/components/ui/Modal";
import type { DocKind, TradingDoc } from "@/lib/trading/types";
import { exampleSessionContent } from "@/lib/trading/templates";

type Sort = "modified" | "created" | "title";

export function DocLibrary({ kind, basePath, noun }: { kind: DocKind; basePath: string; noun: string }) {
  const [docs, setDocs] = useState<TradingDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("modified");
  const [category, setCategory] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<TradingDoc | "new" | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("trading_documents").select("*").eq("kind", kind);
    if (error) setError(error.message);
    else setDocs(data as TradingDoc[]);
  }, [kind]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
  }, [load]);

  const categories = useMemo(() => [...new Set((docs ?? []).map((d) => d.category).filter(Boolean))].sort(), [docs]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (docs ?? [])
      .filter((d) => d.archived === showArchived)
      .filter((d) => !category || d.category === category)
      .filter((d) => !needle || `${d.title} ${d.description} ${d.category}`.toLowerCase().includes(needle))
      .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : sort === "created" ? b.created_at.localeCompare(a.created_at) : b.updated_at.localeCompare(a.updated_at)));
  }, [docs, q, sort, category, showArchived]);

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await fn();
    if (error) setError(error.message);
    else {
      setError(null);
      load();
    }
  }
  const sb = () => createClient();

  async function duplicate(d: TradingDoc) {
    const { data: copy, error } = await sb().from("trading_documents").insert({ kind: d.kind, title: `${d.title} (copy)`.slice(0, 200), description: d.description, category: d.category }).select("id").single();
    if (error) return setError(error.message);
    const { data: pages } = await sb().from("trading_document_pages").select("position,content").eq("document_id", d.id).order("position");
    if (pages?.length) {
      const ins = await sb().from("trading_document_pages").insert(pages.map((p: { position: number; content: JSONContent }) => ({ document_id: copy.id, position: p.position, content: p.content })));
      if (ins.error) return setError(ins.error.message);
    }
    load();
  }
  async function remove(d: TradingDoc) {
    if (!(await ask(`Permanently delete “${d.title}” and all its pages? This can’t be undone. (Archive it instead to keep it.)`))) return;
    act(() => sb().from("trading_documents").delete().eq("id", d.id));
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" type="search" placeholder={`Search ${noun}s…`} aria-label={`Search ${noun}s`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="modified">Recently modified</option>
          <option value="created">Recently created</option>
          <option value="title">Title A–Z</option>
        </select>
        {categories.length > 0 && (
          <select className="input w-auto" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All topics</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--sage-deep)]" /> Archived
        </label>
        <button className="btn btn-sage ml-auto" onClick={() => setEditing("new")}>+ New {noun}</button>
      </div>
      <ErrorNote error={error} />
      {docs === null ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="font-display text-xl">{showArchived ? "No archived documents" : docs.length ? "Nothing matches" : `No ${noun}s yet`}</p>
          {!docs.length && <p className="mt-1 text-sm text-muted">Create your first {noun} to get started.</p>}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => (
            <li key={d.id} className="glass flex flex-col p-4">
              <Link href={`${basePath}/${d.id}`} className="min-w-0 flex-1">
                <h3 className="font-display truncate text-lg">{d.title}</h3>
                {d.category && <span className="tag mt-1">{d.category}</span>}
                {d.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{d.description}</p>}
                <p className="mt-2 text-xs text-muted">Created {fmtStamp(d.created_at)}<br />Modified {fmtStamp(d.updated_at)}</p>
              </Link>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                <Link className="btn btn-sm" href={`${basePath}/${d.id}`}>Open</Link>
                <button className="btn btn-sm" onClick={() => setEditing(d)}>Rename</button>
                <button className="btn btn-sm" onClick={() => duplicate(d)}>Duplicate</button>
                <button className="btn btn-sm" onClick={() => act(() => sb().from("trading_documents").update({ archived: !d.archived }).eq("id", d.id))}>{d.archived ? "Restore" : "Archive"}</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <DocForm kind={kind} noun={noun} doc={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {dialog}
    </section>
  );
}

function DocForm({ kind, noun, doc, categories, onClose, onSaved }: { kind: DocKind; noun: string; doc: TradingDoc | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(doc?.title ?? "");
  const [description, setDescription] = useState(doc?.description ?? "");
  const [category, setCategory] = useState(doc?.category ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("blank");
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    if (doc || kind !== "backtest") return;
    createClient().from("trading_documents").select("id,title").eq("kind", "template").eq("archived", false).order("title")
      .then(({ data }) => setTemplates((data as { id: string; title: string }[]) ?? []));
  }, [doc, kind]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Give it a title.");
    setBusy(true);
    const sb = createClient();
    const row = { title: t, description: description.trim(), category: category.trim() };
    let error: { message: string } | null = null;
    if (doc) {
      ({ error } = await sb.from("trading_documents").update(row).eq("id", doc.id));
    } else {
      const ins = await sb.from("trading_documents").insert({ kind, ...row }).select("id").single();
      error = ins.error;
      if (!error && ins.data) error = await seedPages(sb, ins.data.id as string, from);
    }
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }
  return (
    <Modal title={doc ? `Edit ${noun}` : `New ${noun}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="d-t">Title</label>
          <input id="d-t" className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="d-d">Description (optional)</label>
          <textarea id="d-d" className="input" rows={2} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="d-c">Topic or category (optional)</label>
          <input id="d-c" className="input" list="d-cats" value={category} maxLength={80} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="d-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        {!doc && kind !== "concept" && (
          <div>
            <label className="label" htmlFor="d-from">Start from</label>
            <select id="d-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="blank">Blank page</option>
              <option value="example">Example session template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>Template: {t.title}</option>)}
            </select>
          </div>
        )}
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Gives a new document its first page: blank, the example session template, or a copy of a saved template. */
async function seedPages(sb: ReturnType<typeof createClient>, docId: string, from: string): Promise<{ message: string } | null> {
  if (from === "blank") return null;
  if (from === "example") {
    const { error } = await sb.from("trading_document_pages").insert({ document_id: docId, position: 0, content: exampleSessionContent() });
    return error ? { message: error.message } : null;
  }
  const { data: pages, error: readErr } = await sb.from("trading_document_pages").select("position,content").eq("document_id", from).order("position");
  if (readErr) return { message: readErr.message };
  if (!pages?.length) return null;
  const { error } = await sb.from("trading_document_pages").insert(pages.map((p: { position: number; content: JSONContent }) => ({ document_id: docId, position: p.position, content: p.content })));
  return error ? { message: error.message } : null;
}
