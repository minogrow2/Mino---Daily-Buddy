"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/ui/Modal";
import { saveReflection } from "@/lib/willow/actions";
import type { HomeCtx } from "./context";

const EMPTY = { learned: "", done: "", enjoyed: "" };

/** An optional evening reflection. It is saved to the journal as its own entry. */
export function Reflection({ ctx }: { ctx: HomeCtx }) {
  const [lines, setLines] = useState(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!lines.learned.trim() && !lines.done.trim() && !lines.enjoyed.trim()) {
      setSaved(false);
      return setErr("Write one line for any of these.");
    }
    setBusy(true);
    setErr(null);
    try {
      await saveReflection(ctx.data.today, {
        learned: lines.learned.trim(),
        done: lines.done.trim(),
        enjoyed: lines.enjoyed.trim(),
      });
      setLines(EMPTY);
      setSaved(true);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof EMPTY, label: string) => (
    <div>
      <label className="label" htmlFor={`reflect-${key}`}>{label}</label>
      <input
        id={`reflect-${key}`}
        className="input"
        maxLength={300}
        value={lines[key]}
        onChange={(e) => setLines({ ...lines, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <details className="glass p-5">
      <summary className="cursor-pointer">
        <span className="font-display text-xl">Evening reflection</span>{" "}
        <span className="text-sm text-muted">optional</span>
      </summary>
      <form onSubmit={save} className="mt-4 space-y-3">
        <p className="text-sm text-muted">What did you learn, accomplish and enjoy today?</p>
        {field("learned", "What did you learn?")}
        {field("done", "What did you accomplish?")}
        {field("enjoyed", "What did you enjoy?")}
        <ErrorNote error={err} />
        {saved && <p className="text-sm text-muted">Saved to your journal.</p>}
        <div className="text-right">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save reflection"}</button>
        </div>
      </form>
    </details>
  );
}
