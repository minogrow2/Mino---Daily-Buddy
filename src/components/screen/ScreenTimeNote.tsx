"use client";

import { useEffect, useState } from "react";
import { ErrorNote } from "@/components/ui/Modal";
import { hm } from "@/lib/willow/logic";
import { loadScreenRange, type ScreenDay } from "@/lib/willow/screen";
import { ScreenDialog } from "./ScreenDialog";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The body of the Screen time block on the calendar day page: the day's total and social time, and a log or edit button. */
export function ScreenTimeNote({ day }: { day: string }) {
  const [loaded, setLoaded] = useState<{ day: string; rec: ScreenDay | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    loadScreenRange(day, day)
      .then((rows) => {
        if (live) {
          setLoaded({ day, rec: rows[0] ?? null });
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [day, tick]);

  // undefined while this day is still opening, so a previous day's figures never show under a new date.
  const current = loaded && loaded.day === day ? loaded.rec : undefined;

  return (
    <>
      <ErrorNote error={err} />
      {current === undefined ? (
        <p className="small muted">Opening…</p>
      ) : current ? (
        <p className="small">
          {hm(current.total)}
          {current.social ? ` · social ${hm(current.social)}` : ""}
        </p>
      ) : (
        <p className="small muted">Not logged yet.</p>
      )}
      <div className="row-inline" style={{ marginTop: 6 }}>
        <button type="button" className="wbtn soft small" onClick={() => setOpen(true)}>
          {current ? "Edit screen time" : "Log screen time"}
        </button>
      </div>
      {open && (
        <ScreenDialog
          day={day}
          onSaved={() => {
            setOpen(false);
            setTick((t) => t + 1);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
