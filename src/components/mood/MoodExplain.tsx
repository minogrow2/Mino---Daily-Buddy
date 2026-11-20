"use client";

import { useEffect, useRef, useState } from "react";
import { MiniEditor } from "@/components/notes/MiniEditor";
import { ErrorNote } from "@/components/ui/Modal";
import { saveMoodHtml } from "@/lib/willow/actions";

const AUTOSAVE_MS = 800;

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/**
 * "What is behind this mood?" with a Save note button. The button appears once the text differs from what is saved.
 * Typing also autosaves a moment after it stops, and anything unsaved is written when the box is left, so nothing is lost.
 * Used on Home and on the Mood page; the calendar day page keeps its own copy.
 */
export function MoodExplain({ day, html, onSaved, onError }: { day: string; html: string; onSaved: (html: string) => void; onError?: (msg: string) => void }) {
  const [latest, setLatest] = useState(html);
  const [saved, setSaved] = useState(html);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const latestRef = useRef(html);
  const savedRef = useRef(html);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fail = (e: unknown) => {
    const msg = errorText(e);
    setErr(msg);
    onError?.(msg);
  };

  // Writes whatever was typed last, if it is not saved yet.
  const save = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const h = latestRef.current;
    if (h === savedRef.current) return;
    await saveMoodHtml(day, h);
    savedRef.current = h;
    setSaved(h);
    onSaved(h);
  };

  // The day changes: write the last unsaved text for the old day, then start clean.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (latestRef.current !== savedRef.current) saveMoodHtml(day, latestRef.current).catch(() => {});
    };
  }, [day]);

  const onChange = (h: string) => {
    latestRef.current = h;
    setLatest(h);
    setErr(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save().catch(fail);
    }, AUTOSAVE_MS);
  };

  const dirty = latest !== saved;

  return (
    <>
      <MiniEditor key={day} html={html} label="What is behind this mood?" placeholder="What is behind it? Write as much or as little as you like." onChange={onChange} />
      {dirty && (
        <div className="row-inline" style={{ justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            className="wbtn primary small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await save();
              } catch (e) {
                fail(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save note"}
          </button>
        </div>
      )}
      <ErrorNote error={err} />
    </>
  );
}
