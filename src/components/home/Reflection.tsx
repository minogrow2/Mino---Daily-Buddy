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

  return (
    <details className="card reflection reveal" style={{ alignSelf: "start" }}>
      <summary>
        <span className="eyebrow" style={{ display: "inline" }}>
          Evening reflection
        </span>{" "}
        <span className="small muted">optional</span>
      </summary>
      <form onSubmit={save} className="dlg" style={{ padding: "12px 0 0", gap: 10 }}>
        <p className="small muted">What did you learn, accomplish and enjoy today?</p>
        <label>
          What did you learn?
          <input className="winput" maxLength={300} value={lines.learned} onChange={(e) => setLines({ ...lines, learned: e.target.value })} />
        </label>
        <label>
          What did you accomplish?
          <input className="winput" maxLength={300} value={lines.done} onChange={(e) => setLines({ ...lines, done: e.target.value })} />
        </label>
        <label>
          What did you enjoy?
          <input className="winput" maxLength={300} value={lines.enjoyed} onChange={(e) => setLines({ ...lines, enjoyed: e.target.value })} />
        </label>
        <ErrorNote error={err} />
        {saved && <p className="small muted">Saved to your journal.</p>}
        <div style={{ textAlign: "right" }}>
          <button className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : "Save reflection"}
          </button>
        </div>
      </form>
    </details>
  );
}
