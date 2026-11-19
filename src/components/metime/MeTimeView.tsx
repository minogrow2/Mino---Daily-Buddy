"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote, Modal, useConfirm } from "@/components/ui/Modal";
import { fmtDay, todayYMD } from "@/lib/dates";
import { addActivity, deleteActivity } from "@/lib/willow/actions";
import { hm, weekStart } from "@/lib/willow/logic";
import { BUCKET_CATS, REMINDERS, loadBucket, loadOffline, type BucketRow, type OfflineRow } from "@/lib/willow/metime";
import { addBucketItem, deleteBucketItem, setBucketDone } from "@/lib/willow/metime-actions";

const START_KEY = "willow.offlineStart";
const KINDS: [string, string][] = [
  ["outdoors", "Outdoors and exploring"],
  ["social", "Socializing"],
  ["personal", "Personal time"],
  ["rest", "Rest"],
  ["reading", "Reading or watching"],
  ["workout", "Workout"],
];
const QUICK_KINDS: [string, string][] = [
  ["outdoors", "Outdoors"],
  ["social", "Socializing"],
  ["personal", "Personal"],
  ["rest", "Rest"],
];

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/* The running timer is kept per browser, so it survives a reload. Storage can be blocked, so every access is guarded. */
function readStart(): number | null {
  try {
    const n = Number(window.localStorage.getItem(START_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
function writeStart(v: number | null) {
  try {
    if (v === null) window.localStorage.removeItem(START_KEY);
    else window.localStorage.setItem(START_KEY, String(v));
  } catch {
    /* the timer still works for this visit */
  }
}
const clock = (secs: number) =>
  [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60].map((n) => String(n).padStart(2, "0")).join(":");

/** Me Time: a gentle prompt, an optional offline timer and quick log, this week, and the 100-things bucket list. */
export function MeTimeView() {
  const [today, setToday] = useState<string | null>(null);
  const [offline, setOffline] = useState<OfflineRow[] | null>(null);
  const [bucket, setBucket] = useState<BucketRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [saving, setSaving] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState({ title: "", category: "outdoors", minutes: "" });
  const { ask, dialog } = useConfirm();

  // The clock and the saved timer are read after mount, never while the page is prerendered.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock and the timer after mount
    setToday(todayYMD());
    setStart(readStart());
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([loadOffline(), loadBucket()])
      .then(([o, b]) => {
        if (live) {
          setOffline(o);
          setBucket(b);
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [tick]);

  useEffect(() => {
    if (start === null) return;
    const h = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, [start]);

  const reload = () => setTick((t) => t + 1);
  const fail = (e: unknown) => {
    setErr(errorText(e));
    reload();
  };

  const startTimer = () => {
    const s = Date.now();
    writeStart(s);
    setStart(s);
    setNow(s);
  };
  const stopTimer = () => {
    if (start === null) return;
    const mins = Math.max(1, Math.round((Date.now() - start) / 60000));
    writeStart(null);
    setStart(null);
    setSaving(mins);
  };
  const saveTimer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title || !today) return;
    setSaving(null);
    addActivity(today, { title, category: String(fd.get("category") ?? "outdoors"), minutes: Number(fd.get("minutes")) || 0, offline: true })
      .then(reload)
      .catch(fail);
  };

  const quickSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = quick.title.trim();
    if (!title || !today) return;
    addActivity(today, { title, category: quick.category, minutes: Number(quick.minutes) || 0, offline: true })
      .then(() => {
        setQuick({ title: "", category: quick.category, minutes: "" });
        reload();
      })
      .catch(fail);
  };

  const removeOffline = async (a: OfflineRow) => {
    if (!(await ask("Delete this offline entry?"))) return;
    setOffline((list) => list?.filter((x) => x.id !== a.id) ?? null);
    deleteActivity(a.id).catch(fail);
  };

  const toggleBucket = (b: BucketRow) => {
    const done = !b.done;
    const doneDay = done && today ? today : null;
    setBucket((list) => list?.map((x) => (x.id === b.id ? { ...x, done, done_day: doneDay } : x)) ?? null);
    setBucketDone(b.id, done, doneDay).catch(fail);
  };

  const removeBucket = async (b: BucketRow) => {
    if (!(await ask("Remove this from your bucket list?", "Remove"))) return;
    setBucket((list) => list?.filter((x) => x.id !== b.id) ?? null);
    deleteBucketItem(b.id).catch(fail);
  };

  const addBucket = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    setAdding(false);
    addBucketItem({ title, category: String(fd.get("category") ?? BUCKET_CATS[1]), note: String(fd.get("note") ?? "").trim() })
      .then((row) => setBucket((list) => [...(list ?? []), row]))
      .catch(fail);
  };

  const reminder = today ? REMINDERS[(parseInt(today.slice(-2), 10) + 1) % REMINDERS.length] : "";
  const weekFrom = today ? weekStart(today) : "";
  const weekOffline = (offline ?? []).filter((a) => weekFrom && a.day >= weekFrom);
  const weekMins = weekOffline.reduce((s, a) => s + a.minutes, 0);
  const social = (offline ?? []).filter((a) => a.category === "social").length;
  const bucketDone = (bucket ?? []).filter((b) => b.done).length;
  // Until the first tick (now is still 0 after a reload), the clock reads zero rather than a huge number.
  const secs = start === null ? 0 : Math.max(0, Math.floor(((now || start) - start) / 1000));

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Life outside the phone</div>
        <h1>Me Time</h1>
      </div>
      <ErrorNote error={err} />

      {reminder && (
        <section className="card" style={{ background: "var(--butter)", boxShadow: "none" }}>
          <p className="kicker">{reminder}</p>
          <p className="small" style={{ marginTop: 6 }}>
            Willow will ask gently, and only when you open this page.
          </p>
        </section>
      )}

      <div className="grid two">
        <Card title="Offline timer" eyebrow="Offline activity journal">
          <p className="small muted">Optional. Start it when you head out, stop it when you are back. Don’t track every moment.</p>
          <p className="display num" style={{ fontSize: 40, margin: "14px 0" }}>
            {clock(secs)}
          </p>
          <div className="row-inline">
            {start === null ? (
              <button type="button" className="wbtn primary" disabled={!today} onClick={startTimer}>
                Start timer
              </button>
            ) : (
              <button type="button" className="wbtn primary" onClick={stopTimer}>
                Stop and save
              </button>
            )}
          </div>
          <form className="row-inline" style={{ marginTop: 14 }} onSubmit={quickSave}>
            <input
              className="winput"
              value={quick.title}
              maxLength={120}
              placeholder="Quick log: e.g. Walk by the river"
              aria-label="Quick offline log"
              onChange={(e) => setQuick({ ...quick, title: e.target.value })}
            />
            <select
              className="winput"
              value={quick.category}
              aria-label="Kind"
              style={{ flex: "0 1 160px" }}
              onChange={(e) => setQuick({ ...quick, category: e.target.value })}
            >
              {QUICK_KINDS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="winput"
              type="number"
              min={0}
              value={quick.minutes}
              placeholder="Min"
              aria-label="Minutes"
              style={{ flex: "0 1 90px" }}
              onChange={(e) => setQuick({ ...quick, minutes: e.target.value })}
            />
            <button className="wbtn soft small" type="submit" disabled={!today}>
              Save
            </button>
          </form>
        </Card>

        <Card title="This week" eyebrow="Recent">
          <div className="stats">
            <div className="stat">
              <div className="small muted">Offline time</div>
              <div className="v">{hm(weekMins)}</div>
            </div>
            <div className="stat">
              <div className="small muted">Offline entries</div>
              <div className="v">{weekOffline.length}</div>
            </div>
            <div className="stat">
              <div className="small muted">Time with people</div>
              <div className="v">{social}</div>
            </div>
            <div className="stat">
              <div className="small muted">Bucket list done</div>
              <div className="v">
                {bucketDone}/{(bucket ?? []).length}
              </div>
            </div>
          </div>
          <ul className="list" style={{ marginTop: 12 }}>
            {(offline ?? []).slice(0, 6).map((a) => (
              <li key={a.id} className="item">
                <span className="grow">
                  {a.title} <span className="small muted">{fmtDay(a.day)}{a.minutes ? ` · ${hm(a.minutes)}` : ""}</span>
                </span>
                <button type="button" className="wbtn danger small" onClick={() => void removeOffline(a)}>
                  Delete
                </button>
              </li>
            ))}
            {offline !== null && offline.length === 0 && <li className="empty">Nothing offline logged yet. A walk counts.</li>}
          </ul>
        </Card>
      </div>

      <Card
        title="100 things to experience"
        eyebrow="Bucket list"
        right={
          <button type="button" className="wbtn small soft" onClick={() => setAdding(true)}>
            + Add
          </button>
        }
      >
        <ul className="list">
          {(bucket ?? []).map((b) => (
            <li key={b.id} className={`item ${b.done ? "done" : ""}`}>
              <button
                type="button"
                className="check"
                role="checkbox"
                aria-checked={b.done}
                aria-label={b.title}
                onClick={() => toggleBucket(b)}
              >
                {b.done ? "✓" : ""}
              </button>
              <span className="grow">
                {b.title}
                <br />
                <span className="small muted">
                  {b.category}
                  {b.done_day ? ` · done ${fmtDay(b.done_day)}` : ""}
                  {b.note ? ` · ${b.note}` : ""}
                </span>
              </span>
              <button type="button" className="wbtn danger small" onClick={() => void removeBucket(b)}>
                Delete
              </button>
            </li>
          ))}
          {bucket !== null && bucket.length === 0 && (
            <li className="empty">Add places you want to visit and experiences you want to try.</li>
          )}
        </ul>
      </Card>

      {saving !== null && (
        <Modal title="Save this offline time" eyebrow="Offline timer" onClose={() => setSaving(null)}>
          <p className="small muted">That was about {hm(saving)}. Name it and it goes in your offline journal.</p>
          <form className="grid" onSubmit={saveTimer}>
            <label>
              What were you doing?
              <input className="winput" name="title" required maxLength={120} />
            </label>
            <label>
              Kind
              <select className="winput" name="category" defaultValue="outdoors">
                {KINDS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minutes
              <input className="winput" name="minutes" type="number" min={0} defaultValue={saving} />
            </label>
            <div className="actions">
              <button type="submit" className="wbtn primary small">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {adding && (
        <Modal title="Add to my 100 things" eyebrow="Bucket list" onClose={() => setAdding(false)}>
          <form className="grid" onSubmit={addBucket}>
            <label>
              Experience or place
              <input className="winput" name="title" required maxLength={140} />
            </label>
            <label>
              Category
              <select className="winput" name="category" defaultValue="Experiences">
                {BUCKET_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Why it matters
              <textarea className="winput" name="note" rows={2} maxLength={300} />
            </label>
            <div className="actions">
              <button type="button" className="wbtn ghost small" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="wbtn primary small">
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog}
    </div>
  );
}
