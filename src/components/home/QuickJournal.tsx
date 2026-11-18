"use client";

import { useRef, useState } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { plainOf } from "@/lib/notes";
import { saveQuickJournal } from "@/lib/willow/actions";
import type { HomeCtx } from "./context";

/** Today’s quick journal entry, written in the same rich-text editor as the mood page. */
export function QuickJournal({ ctx, onSaved }: { ctx: HomeCtx; onSaved: () => void }) {
  const today = ctx.data.today;
  const html = useRef("");
  const [round, setRound] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const body = plainOf(html.current);
    if (!body) {
      setSaved(false);
      setErr("Write a line first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await saveQuickJournal(today, html.current, body);
      html.current = "";
      setRound((r) => r + 1);
      setSaved(true);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card eyebrow="Today" title="Quick journal" id="quick-journal">
      <ErrorNote error={err} />
      <MiniEditor
        key={round}
        html=""
        label="Quick journal entry"
        placeholder="Something about your day…"
        checklist
        onChange={(v) => {
          html.current = v;
          setSaved(false);
        }}
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-muted">Saved to your journal.</span>}
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save entry"}
        </button>
      </div>
    </Card>
  );
}
