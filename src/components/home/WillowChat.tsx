"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, useConfirm } from "@/components/ui/Modal";
import { askWillow, clearChat, saveChatMessage, setChatJournal } from "@/lib/willow/actions";
import { loadRecentJournal } from "@/lib/willow/data";
import { willowContext } from "@/lib/willow/logic";
import type { ChatMsg } from "@/lib/willow/types";
import type { HomeCtx } from "./context";

const NOTES: Record<string, string> = {
  not_configured:
    "Willow can’t reply yet. Add an Anthropic API key (ANTHROPIC_API_KEY) to this site’s settings on Vercel, then send again. Your message is saved.",
  rate_limited: "Too many messages in a short time. Wait a little, then try again.",
  failed: "Willow couldn’t answer that one. Try asking in a different way.",
};

/** Chat with Willow. Only what the person chooses to share is sent; journal text needs its own opt-in. */
export function WillowChat({ ctx }: { ctx: HomeCtx }) {
  const { data, edit, reload } = ctx;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { ask, dialog } = useConfirm();

  const push = (m: ChatMsg) => edit((d) => ({ ...d, chat: [...d.chat, m] }));

  async function send(e: FormEvent) {
    e.preventDefault();
    const msg = text.trim().slice(0, 800);
    if (!msg || busy) return;
    setText("");
    setBusy(true);
    setErr(null);
    try {
      push(await saveChatMessage("me", msg));
      const recent: { role: "me" | "mino" | "note"; body: string }[] = [
        ...data.chat.filter((c) => c.role !== "note").map((c) => ({ role: c.role as "me" | "mino" | "note", body: c.body })),
        { role: "me" as const, body: msg },
      ].slice(-8);
      const turns = recent.map((c) => ({ role: c.role === "me" ? ("user" as const) : ("assistant" as const), content: c.body }));
      while (turns.length && turns[0].role !== "user") turns.shift();
      const journal = data.chatJournal ? await loadRecentJournal() : [];
      const res = await askWillow(turns, willowContext(data, journal));
      if ("text" in res) push(await saveChatMessage("mino", res.text));
      else push(await saveChatMessage("note", NOTES[res.error] ?? NOTES.failed));
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Something went wrong. Try again.");
      reload();
    } finally {
      setBusy(false);
    }
  }

  function toggleJournal(on: boolean) {
    edit((d) => ({ ...d, chatJournal: on }));
    setChatJournal(on).catch((er) => {
      setErr(er instanceof Error ? er.message : "Something went wrong. Try again.");
      reload();
    });
  }

  async function clear() {
    if (!(await ask("This removes the whole conversation with Willow from this account."))) return;
    edit((d) => ({ ...d, chat: [] }));
    clearChat().catch(reload);
  }

  return (
    <Card eyebrow="Conversation" title="Chat with Willow" id="chat">
      <ErrorNote error={err} />
      <div className="max-h-[340px] space-y-2 overflow-auto pr-1" aria-live="polite">
        {data.chat.length === 0 && !busy && (
          <p className="text-sm text-muted">Say hello. Willow can help you plan, reflect, or find something to do outside.</p>
        )}
        {data.chat.map((c) =>
          c.role === "note" ? (
            <p key={c.id} className="text-xs italic text-muted">{c.body}</p>
          ) : (
            <div
              key={c.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                c.role === "me" ? "ml-auto bg-[var(--pink)]" : "bg-[rgba(110,156,126,0.16)]"
              }`}
            >
              {c.body}
            </div>
          ),
        )}
        {busy && <div className="max-w-[85%] rounded-2xl bg-[rgba(110,156,126,0.16)] px-3 py-2 text-sm">Thinking…</div>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="input"
          value={text}
          maxLength={800}
          placeholder="Talk to Willow…"
          aria-label="Message Willow"
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-sm shrink-0" disabled={busy}>Send</button>
      </form>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-[var(--sage-deep)]" checked={data.chatJournal} onChange={(e) => toggleJournal(e.target.checked)} />
        Let Willow read my last five journal entries. Off by default.
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">Willow sees goals, today’s checklist, tasks and mood. Journal text only if you turn it on above.</span>
        {data.chat.length > 0 && <button type="button" className="btn btn-sm btn-danger" onClick={clear}>Delete conversation</button>}
      </div>
      {dialog}
    </Card>
  );
}
