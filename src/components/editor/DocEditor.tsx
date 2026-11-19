"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { RichEditor } from "./RichEditor";
import { dehydrate, hydrate, mediaIdsIn, signedUrls } from "@/lib/media";
import { fmtStamp } from "@/lib/dates";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";

type Page = { id: string; position: number; content: JSONContent };
type Save = "saved" | "saving" | "error" | "idle";
const EMPTY: JSONContent = { type: "doc", content: [] };

export function DocEditor({ documentId, backHref, backLabel }: { documentId: string; backHref: string; backLabel: string }) {
  const sb = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [updated, setUpdated] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [save, setSave] = useState<Save>("idle");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const pending = useRef<Map<string, JSONContent>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Map<string, JSONContent>>(new Map());
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    (async () => {
      const { data: doc, error: e1 } = await sb.from("trading_documents").select("title,updated_at").eq("id", documentId).maybeSingle();
      if (e1) return setError(e1.message);
      if (!doc) return setMissing(true);
      const first = await sb.from("trading_document_pages").select("id,position,content").eq("document_id", documentId).order("position");
      if (first.error) return setError(first.error.message);
      let rows = first.data;
      if (!rows?.length) {
        const ins = await sb.from("trading_document_pages").insert({ document_id: documentId, position: 0, content: EMPTY }).select("id,position,content");
        if (ins.error) return setError(ins.error.message);
        rows = ins.data;
      }
      const ids = rows!.flatMap((r) => mediaIdsIn(r.content as JSONContent));
      const urls = await signedUrls(ids);
      const list = rows!.map((r) => ({ id: r.id, position: r.position, content: hydrate(r.content as JSONContent, urls) }));
      list.forEach((p) => latest.current.set(p.id, p.content));
      setTitle(doc.title);
      setUpdated(doc.updated_at);
      setPages(list);
      setActive(list[0].id);
    })();
  }, [sb, documentId]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const batch = [...pending.current.entries()];
    if (!batch.length) return;
    pending.current = new Map();
    setSave("saving");
    for (const [id, content] of batch) {
      const { error } = await sb.from("trading_document_pages").update({ content: dehydrate(content) }).eq("id", id);
      if (error) {
        batch.forEach(([k, v]) => !pending.current.has(k) && pending.current.set(k, v));
        setSave("error");
        setError(`Could not save: ${error.message}`);
        return;
      }
    }
    const now = new Date().toISOString();
    await sb.from("trading_documents").update({ updated_at: now }).eq("id", documentId);
    setUpdated(now);
    setError(null);
    setSave("saved");
  }, [sb, documentId]);

  const onChange = useCallback(
    (pageId: string, json: JSONContent) => {
      latest.current.set(pageId, json);
      pending.current.set(pageId, json);
      setSave("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 800);
    },
    [flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      flush();
    };
  }, [flush]);

  async function renameTitle(v: string) {
    const t = v.trim();
    if (!t) return;
    const { error } = await sb.from("trading_documents").update({ title: t }).eq("id", documentId);
    if (error) setError(error.message);
    else {
      setTitle(t);
      setSave("saved");
    }
  }
  async function switchPage(id: string) {
    await flush();
    // Carry unsaved-in-state edits into the page list so the remounted editor shows them.
    setPages((ps) => ps && ps.map((p) => ({ ...p, content: latest.current.get(p.id) ?? p.content })));
    setActive(id);
  }
  async function addPage() {
    await flush();
    setPages((ps) => ps && ps.map((p) => ({ ...p, content: latest.current.get(p.id) ?? p.content })));
    const position = Math.max(-1, ...(pages ?? []).map((p) => p.position)) + 1;
    const { data, error } = await sb.from("trading_document_pages").insert({ document_id: documentId, position, content: EMPTY }).select("id,position,content").single();
    if (error) return setError(error.message);
    latest.current.set(data.id, EMPTY);
    setPages((ps) => [...(ps ?? []), { id: data.id, position: data.position, content: EMPTY }]);
    setActive(data.id);
  }
  async function deletePage(p: Page, n: number) {
    if ((pages?.length ?? 0) <= 1) return;
    if (!(await ask(`Delete page ${n} and everything on it?`))) return;
    pending.current.delete(p.id);
    const { error } = await sb.from("trading_document_pages").delete().eq("id", p.id);
    if (error) return setError(error.message);
    const rest = pages!.filter((x) => x.id !== p.id);
    setPages(rest);
    if (active === p.id) setActive(rest[0].id);
  }

  if (missing)
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="mb-4">This document doesn’t exist or isn’t yours.</p>
        <Link className="btn" href={backHref}>← {backLabel}</Link>
      </div>
    );
  if (!pages || !active)
    return <div className="p-10 text-center text-sm text-muted">{error ? <ErrorNote error={error} /> : "Opening document…"}</div>;

  const page = pages.find((p) => p.id === active)!;
  const status = save === "saving" ? "Saving…" : save === "error" ? "Not saved" : save === "saved" ? "All changes saved" : updated ? `Last saved ${fmtStamp(updated)}` : "";

  return (
    <div className="ft-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href={backHref} onClick={() => flush()} className="btn btn-sm">← {backLabel}</Link>
          <input
            aria-label="Document title"
            className="font-display min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-2xl outline-none focus:bg-surface"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => renameTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
          />
          <span role="status" aria-live="polite" className={`text-xs ${save === "error" ? "text-rose" : "text-muted"}`}>{status}</span>
        </div>
        <div className="mb-3"><ErrorNote error={error} /></div>
        <div className="mb-3 flex flex-wrap items-center gap-1" role="tablist" aria-label="Pages">
          {pages.map((p, i) => (
            <span key={p.id} className="flex items-center">
              <button role="tab" aria-selected={p.id === active} onClick={() => switchPage(p.id)} className={`rounded-l-lg px-3 py-1 text-sm ${p.id === active ? "bg-surface font-medium shadow-sm" : "text-muted hover:bg-surface-2"} ${pages.length > 1 ? "" : "rounded-r-lg"}`}>
                Page {i + 1}
              </button>
              {pages.length > 1 && (
                <button aria-label={`Delete page ${i + 1}`} title="Delete page" onClick={() => deletePage(p, i + 1)} className={`rounded-r-lg px-1.5 py-1 text-xs text-muted hover:text-rose ${p.id === active ? "bg-surface shadow-sm" : "hover:bg-surface-2"}`}>✕</button>
              )}
            </span>
          ))}
          <button className="btn btn-sm ml-1" onClick={addPage}>+ Page</button>
        </div>
        <RichEditor key={page.id} content={page.content} onChange={(j) => onChange(page.id, j)} onError={setError} />
      </div>
      {dialog}
    </div>
  );
}
