"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";

type Sub = { id: string; topic_id: string; title: string; position: number; done: boolean };
type Topic = { id: string; title: string; position: number; collapsed: boolean; done: boolean };

const STARTER: [string, string[]][] = [
  ["Trading Foundations", ["Introduction to financial markets", "Market participants", "Market sessions", "Currency pairs"]],
  ["Technical Analysis", ["Candlestick patterns", "Support and resistance", "Market structure", "Trend analysis"]],
  ["Risk Management", ["Position sizing", "Risk-to-reward ratio", "Stop loss", "Drawdown"]],
];

export function Roadmap() {
  const sb = createClient();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    const c = createClient();
    const [t, s] = await Promise.all([c.from("roadmap_topics").select("*").order("position"), c.from("roadmap_subtopics").select("*").order("position")]);
    if (t.error || s.error) return setError((t.error ?? s.error)!.message);
    setTopics(t.data as Topic[]);
    setSubs(s.data as Sub[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    load();
  }, [load]);

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) setError(error.message);
    else {
      setError(null);
      await load();
    }
  };
  const subsOf = (id: string) => subs.filter((s) => s.topic_id === id);

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    const t = newTopic.trim();
    if (!t) return;
    const position = Math.max(-1, ...(topics ?? []).map((x) => x.position)) + 1;
    setNewTopic("");
    await run(sb.from("roadmap_topics").insert({ title: t, position }));
  }
  async function addSub(topic: Topic, title: string) {
    const t = title.trim();
    if (!t) return;
    const position = Math.max(-1, ...subsOf(topic.id).map((x) => x.position)) + 1;
    // A new, unfinished subtopic means the topic is no longer complete.
    await run(sb.from("roadmap_subtopics").insert({ topic_id: topic.id, title: t, position }));
    if (topic.done) await run(sb.from("roadmap_topics").update({ done: false }).eq("id", topic.id));
  }
  async function toggleSub(s: Sub, topic: Topic) {
    await run(sb.from("roadmap_subtopics").update({ done: !s.done }).eq("id", s.id));
    const after = subsOf(topic.id).map((x) => (x.id === s.id ? !s.done : x.done));
    const allDone = after.length > 0 && after.every(Boolean);
    if (allDone !== topic.done) await run(sb.from("roadmap_topics").update({ done: allDone }).eq("id", topic.id));
  }
  async function toggleTopic(t: Topic) {
    const done = !t.done;
    await run(sb.from("roadmap_topics").update({ done }).eq("id", t.id));
    if (subsOf(t.id).length) await run(sb.from("roadmap_subtopics").update({ done }).eq("topic_id", t.id));
  }
  async function removeTopic(t: Topic) {
    const n = subsOf(t.id).length;
    if (await ask(`Delete the topic “${t.title}”${n ? ` and its ${n} subtopic${n > 1 ? "s" : ""}` : ""}?`)) await run(sb.from("roadmap_topics").delete().eq("id", t.id));
  }
  async function removeSub(s: Sub, topic: Topic) {
    if (!(await ask(`Delete the subtopic “${s.title}”?`))) return;
    await run(sb.from("roadmap_subtopics").delete().eq("id", s.id));
    const rest = subsOf(topic.id).filter((x) => x.id !== s.id);
    if (rest.length && rest.every((x) => x.done) !== topic.done) await run(sb.from("roadmap_topics").update({ done: rest.every((x) => x.done) }).eq("id", topic.id));
  }
  async function saveRename(kind: "topic" | "sub") {
    if (!editing) return;
    const v = editing.value.trim();
    const id = editing.id;
    setEditing(null);
    if (!v) return;
    await run(sb.from(kind === "topic" ? "roadmap_topics" : "roadmap_subtopics").update({ title: v }).eq("id", id));
  }
  async function seed() {
    for (const [i, [title, items]] of STARTER.entries()) {
      const { data, error } = await sb.from("roadmap_topics").insert({ title, position: i }).select("id").single();
      if (error) return setError(error.message);
      await run(sb.from("roadmap_subtopics").insert(items.map((t, j) => ({ topic_id: data.id, title: t, position: j }))));
    }
  }

  if (topics === null) return <p className="py-10 text-center text-sm text-muted">{error ?? "Loading…"}</p>;
  const total = subs.length;
  const done = subs.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const renameInput = (kind: "topic" | "sub") => (
    <input
      autoFocus
      className="input py-1"
      aria-label="Rename"
      value={editing!.value}
      maxLength={200}
      onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
      onBlur={() => saveRename(kind)}
      onKeyDown={(e) => (e.key === "Enter" ? e.currentTarget.blur() : e.key === "Escape" && setEditing(null))}
    />
  );

  return (
    <section>
      <div className="glass mb-4 p-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">Learning progress</span>
          <span className="text-muted">{done} of {total} subtopics · {pct}%</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Learning progress"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <ErrorNote error={error} />
      <form onSubmit={addTopic} className="my-4 flex gap-2">
        <input className="input" placeholder="Add a topic, e.g. Market Structure" aria-label="New topic" value={newTopic} maxLength={200} onChange={(e) => setNewTopic(e.target.value)} />
        <button className="btn btn-sage">Add topic</button>
      </form>
      {topics.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="font-display text-xl">Your roadmap is empty</p>
          <p className="mt-1 text-sm text-muted">Add your own topics above, or start from a small example you can freely change.</p>
          <button className="btn mt-4" onClick={seed}>Start from example topics</button>
        </div>
      ) : (
        <ul className="space-y-4">
          {topics.map((t) => {
            const ss = subsOf(t.id);
            const d = ss.filter((s) => s.done).length;
            const p = ss.length ? Math.round((d / ss.length) * 100) : t.done ? 100 : 0;
            return (
              <li key={t.id} className="glass p-4">
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm" aria-expanded={!t.collapsed} aria-label={`${t.collapsed ? "Expand" : "Collapse"} ${t.title}`} onClick={() => run(sb.from("roadmap_topics").update({ collapsed: !t.collapsed }).eq("id", t.id))}>
                    {t.collapsed ? "▸" : "▾"}
                  </button>
                  <input type="checkbox" className="h-5 w-5 accent-[var(--sage-deep)]" checked={t.done} onChange={() => toggleTopic(t)} aria-label={`Mark topic ${t.title} ${t.done ? "not completed" : "completed"}`} />
                  <div className="min-w-0 flex-1">
                    {editing?.id === t.id ? renameInput("topic") : <h3 className={`font-display truncate text-lg ${t.done ? "line-through opacity-70" : ""}`}>{t.title}</h3>}
                  </div>
                  <span className="hidden text-xs text-muted sm:inline">{ss.length ? `${d}/${ss.length}` : "No subtopics"}</span>
                  <button className="btn btn-sm" onClick={() => setEditing({ id: t.id, value: t.title })}>Rename</button>
                  <button className="btn btn-sm btn-danger" onClick={() => removeTopic(t)}>Delete</button>
                </div>
                <div className="bar mt-3" aria-hidden><i style={{ width: `${p}%` }} /></div>
                {!t.collapsed && (
                  <div className="mt-3 pl-2 sm:pl-10">
                    <ul className="space-y-1.5">
                      {ss.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                          <input type="checkbox" className="h-4 w-4 accent-[var(--sage-deep)]" checked={s.done} onChange={() => toggleSub(s, t)} aria-label={`Mark ${s.title} ${s.done ? "not completed" : "completed"}`} />
                          <div className="min-w-0 flex-1">
                            {editing?.id === s.id ? renameInput("sub") : <span className={`text-sm ${s.done ? "line-through opacity-60" : ""}`}>{s.title}</span>}
                          </div>
                          <button className="btn btn-sm" onClick={() => setEditing({ id: s.id, value: s.title })}>Rename</button>
                          <button className="btn btn-sm btn-danger" onClick={() => removeSub(s, t)}>Delete</button>
                        </li>
                      ))}
                    </ul>
                    <SubAdder onAdd={(v) => addSub(t, v)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </section>
  );
}

function SubAdder({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(""); }}>
      <input className="input py-1 text-sm" placeholder="Add a subtopic" aria-label="New subtopic" value={v} maxLength={200} onChange={(e) => setV(e.target.value)} />
      <button className="btn btn-sm">Add</button>
    </form>
  );
}
