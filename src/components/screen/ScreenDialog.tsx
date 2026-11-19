"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";
import { hm } from "@/lib/willow/logic";
import { loadScreenRange, parseApps, type ScreenDay } from "@/lib/willow/screen";
import { saveScreenDay } from "@/lib/willow/screen-actions";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Log or edit one day of screen time. Loads the day first so the form starts with what is saved. */
export function ScreenDialog({ day, onSaved, onClose }: { day: string; onSaved: () => void; onClose: () => void }) {
  const [rec, setRec] = useState<ScreenDay | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadScreenRange(day, day)
      .then((rows) => {
        if (live) setRec(rows[0] ?? null);
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [day]);

  return (
    <Modal title="Log screen time" onClose={onClose}>
      {rec === undefined ? (
        err ? <ErrorNote error={err} /> : <p className="small muted">Opening…</p>
      ) : (
        <ScreenForm key={day} day={day} record={rec} onSaved={onSaved} onClose={onClose} />
      )}
    </Modal>
  );
}

function ScreenForm({
  day,
  record,
  onSaved,
  onClose,
}: {
  day: string;
  record: ScreenDay | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(day);
  const [hours, setHours] = useState(record ? String(Math.floor(record.total / 60)) : "");
  const [minutes, setMinutes] = useState(record ? String(record.total % 60) : "");
  const [social, setSocial] = useState(record ? String(record.social) : "");
  const [apps, setApps] = useState(record ? record.apps.map((a) => `${a.name}, ${a.minutes}`).join("\n") : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      setErr("Pick a date.");
      return;
    }
    const total = Math.max(0, Math.floor(Number(hours) || 0)) * 60 + Math.max(0, Math.round(Number(minutes) || 0));
    if (total <= 0) {
      setErr("Enter the total screen time for the day.");
      return;
    }
    if (total > 24 * 60) {
      setErr("A day has 24 hours. Check the numbers.");
      return;
    }
    const socialMin = Math.max(0, Math.round(Number(social) || 0));
    if (socialMin > total) {
      setErr("Social media time can’t be more than the total for the day.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (date !== day && (await loadScreenRange(date, date)).length) {
        throw new Error("That day already has screen time. Pick another day, or edit that day.");
      }
      await saveScreenDay({
        day: date,
        total,
        social: socialMin,
        apps: parseApps(apps),
        moveFrom: record && date !== day ? day : null,
      });
      onSaved();
    } catch (er) {
      setErr(errorText(er));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
      <label>
        Date
        <input className="winput" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="row">
        <label>
          Total hours
          <input className="winput" type="number" min={0} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label>
          Total minutes
          <input className="winput" type="number" min={0} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      <label>
        Social media minutes <span className="small muted">optional</span>
        <input className="winput" type="number" min={0} inputMode="numeric" value={social} onChange={(e) => setSocial(e.target.value)} />
      </label>
      <label>
        Most used apps <span className="small muted">one per line: app name, minutes</span>
        <textarea
          className="winput"
          rows={3}
          maxLength={600}
          placeholder="Messages, 40"
          value={apps}
          onChange={(e) => setApps(e.target.value)}
        />
      </label>
      <ErrorNote error={err} />
      <div className="actions">
        <button type="button" className="wbtn ghost small" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="wbtn primary small" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {record && <span className="small muted">Saved: {hm(record.total)} total</span>}
    </form>
  );
}
