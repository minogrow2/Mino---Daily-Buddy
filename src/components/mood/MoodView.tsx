"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ErrorNote } from "@/components/ui/Modal";
import { addDays, daysInMonth, fmtDay, fmtMonth, monthStartOf, todayYMD, weekday } from "@/lib/dates";
import { moodOf, MOODS } from "@/lib/willow/constants";
import { hm, pct } from "@/lib/willow/logic";
import { isLogged, loadMoodPage, splitPages, textOf, type MoodPage } from "@/lib/willow/mood";
import { setDayPin } from "@/lib/willow/mood-actions";
import type { MoodPhoto } from "@/lib/willow/types";
import { usePhotoUrls } from "@/lib/usePhotoUrls";
import { MoodDayCard } from "./MoodDayCard";
import { MoodDayDialog } from "./MoodDayDialog";
import { ScrapBook, ScrapPage } from "./ScrapPage";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The Mood page: a day picker, the mood card, the last 30 days, a month view, patterns beside routines, and the scrapbook. */
export function MoodView() {
  // The clock is read after mount, never while the page is prerendered.
  const [today, setToday] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [page, setPage] = useState<MoodPage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock after mount
    setToday(todayYMD());
  }, []);

  useEffect(() => {
    if (!today) return;
    let live = true;
    loadMoodPage(addDays(today, -29))
      .then((p) => {
        if (live) {
          setPage(p);
          setErr(null);
        }
      })
      .catch((e) => {
        if (live) setErr(errorText(e));
      });
    return () => {
      live = false;
    };
  }, [today, tick]);

  const cur = picked ?? today;
  const moodBy = useMemo(() => new Map((page?.moods ?? []).map((m) => [m.day, m] as const)), [page]);
  const photosBy = useMemo(() => {
    const map = new Map<string, MoodPhoto[]>();
    for (const p of page?.photos ?? []) {
      const list = map.get(p.day);
      if (list) list.push(p);
      else map.set(p.day, [p]);
    }
    return map;
  }, [page]);
  const pinned = useMemo(() => new Set(page?.pins ?? []), [page]);
  const logged = useMemo(() => {
    const days = new Set<string>([...(page?.moods ?? []).map((m) => m.day), ...photosBy.keys()]);
    return [...days]
      .filter((d) => isLogged(moodBy.get(d), photosBy.get(d)?.length ?? 0))
      .sort((a, b) => (a < b ? 1 : -1));
  }, [page, moodBy, photosBy]);
  const parts = useMemo(() => splitPages(logged, pinned, showAll), [logged, pinned, showAll]);
  const firstIds = [...parts.pinned, ...parts.shown]
    .map((d) => photosBy.get(d)?.[0]?.media_id)
    .filter((x): x is string => !!x);
  const urls = usePhotoUrls(firstIds);

  const days30 = useMemo(() => (today ? Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)) : []), [today]);
  const habitCount = useMemo(() => {
    const ids = new Set(page?.habitIds ?? []);
    const counts = new Map<string, number>();
    for (const c of page?.checks ?? []) if (ids.has(c.habit_id)) counts.set(c.day, (counts.get(c.day) ?? 0) + 1);
    return counts;
  }, [page]);

  if (!today || !page || !cur) {
    return (
      <div className="grid">
        <div>
          <div className="eyebrow">Mood</div>
          <h1>How are you, really?</h1>
        </div>
        <ErrorNote error={err} />
        {!err && <p className="empty">Opening your mood page…</p>}
      </div>
    );
  }

  const dist = MOODS.map((m) => ({ ...m, n: days30.filter((d) => moodBy.get(d)?.mood === m.key).length }));
  const maxN = Math.max(1, ...dist.map((x) => x.n));
  const routines = MOODS.flatMap((m) => {
    const ds = days30.filter((d) => moodBy.get(d)?.mood === m.key);
    if (!ds.length) return [];
    const avgHab = Math.round((ds.reduce((s, d) => s + (habitCount.get(d) ?? 0), 0) / ds.length) * 10) / 10;
    const scr = ds.map((d) => page.screen[d]).filter((v): v is number => v != null);
    const avgScr = scr.length ? scr.reduce((a, b) => a + b, 0) / scr.length : null;
    return [{ ...m, n: ds.length, avgHab, avgScr }];
  });

  const first = monthStartOf(cur);
  const lead = (weekday(first) + 6) % 7;
  const cells = [
    ...DOW.map((x) => (
      <div key={x} className="dow">
        {x}
      </div>
    )),
    ...Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="day blank" />),
    ...Array.from({ length: daysInMonth(first) }, (_, i) => {
      const ymd = `${first.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`;
      const mood = moodOf(moodBy.get(ymd)?.mood);
      return (
        <div
          key={ymd}
          className={`day${ymd === today ? " today" : ""}`}
          style={{ background: mood ? "var(--surface-2)" : "transparent", fontSize: 15 }}
        >
          {mood ? <Icon body={mood.icon} className="mi" /> : i + 1}
        </div>
      );
    }),
  ];

  const edit = (fn: (p: MoodPage) => MoodPage) => setPage((p) => (p ? fn(p) : p));
  const reload = () => setTick((t) => t + 1);
  const togglePin = (d: string) => {
    const on = !pinned.has(d);
    setPage((p) => (p ? { ...p, pins: on ? [...p.pins, d] : p.pins.filter((x) => x !== d) } : p));
    setDayPin(d, on).catch((e) => {
      setErr(errorText(e));
      reload();
    });
  };
  const editDay = (d: string) => {
    setOpen(null);
    setPicked(d === today ? null : d);
    window.setTimeout(() => document.getElementById("mood-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const snip = (d: string) => textOf(moodBy.get(d)).slice(0, 140);

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Mood</div>
        <h1>How are you, really?</h1>
      </div>
      <ErrorNote error={err} />
      <div className="row-inline">
        <label className="small muted row-inline" style={{ gap: 8 }}>
          Day
          <input
            className="winput"
            type="date"
            value={cur}
            max={today}
            style={{ width: "auto" }}
            onChange={(e) => {
              const v = e.target.value;
              setPicked(v && v < today ? v : null);
            }}
          />
        </label>
        {cur !== today && (
          <button type="button" className="wbtn ghost small" onClick={() => setPicked(null)}>
            Back to today
          </button>
        )}
      </div>

      <div className="grid two">
        <MoodDayCard
          day={cur}
          today={today}
          row={moodBy.get(cur)}
          photos={photosBy.get(cur) ?? []}
          edit={edit}
          reload={reload}
        />
        <Card title="Last 30 days" eyebrow="Distribution">
          <div className="grid" style={{ gap: 8 }}>
            {dist.map((x) => (
              <div key={x.key} className="row-inline" style={{ gap: 10 }}>
                <span className="row-inline" style={{ gap: 8, width: 130 }}>
                  <Icon body={x.icon} className="mi mi-sm" />
                  {x.label}
                </span>
                <div className="bar" style={{ flex: 1 }}>
                  <span style={{ width: `${pct(x.n, maxN)}%` }} />
                </div>
                <span className="num small" style={{ width: 24, textAlign: "right" }}>
                  {x.n}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid two">
        <Card title="Mood calendar" eyebrow={fmtMonth(cur)}>
          <div className="month-grid mood-cal">{cells}</div>
        </Card>
        <Card title="Patterns next to routines" eyebrow="Last 30 days">
          {routines.length ? (
            <>
              <div className="table-scroll">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>Mood</th>
                      <th>Days</th>
                      <th>Habits (avg)</th>
                      <th>Screen (avg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routines.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <span className="row-inline" style={{ gap: 8 }}>
                            <Icon body={r.icon} className="mi mi-sm" />
                            {r.label}
                          </span>
                        </td>
                        <td className="num">{r.n}</td>
                        <td className="num">{r.avgHab}</td>
                        <td className="num">{r.avgScr != null ? hm(r.avgScr) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                Side by side, not cause and effect.
              </p>
            </>
          ) : (
            <div className="empty">Log a few moods and this will show them next to your routines.</div>
          )}
        </Card>
      </div>

      <Card title="Scrapbook" eyebrow="History">
        <p className="small muted">Tap a page to open it. Pin the days you want to keep at the top.</p>
        <ScrapBook
          pinned={parts.pinned}
          shown={parts.shown}
          older={parts.older}
          showAll={showAll}
          onMore={() => setShowAll((s) => !s)}
          empty={<div className="empty">No moods logged yet. Your scrapbook starts with the first day you log.</div>}
          render={(d, i) => {
            const photos = photosBy.get(d) ?? [];
            return (
              <ScrapPage
                key={d}
                date={fmtDay(d, { weekday: "short", month: "short", day: "numeric" })}
                index={i}
                pinned={pinned.has(d)}
                mood={moodOf(moodBy.get(d)?.mood)}
                photoUrl={photos[0] ? urls[photos[0].media_id] : undefined}
                photoCount={photos.length}
                snippet={snip(d)}
                onOpen={() => setOpen(d)}
                onPin={() => togglePin(d)}
              />
            );
          }}
        />
      </Card>

      {open && (
        <MoodDayDialog
          day={open}
          row={moodBy.get(open)}
          photos={photosBy.get(open) ?? []}
          pinned={pinned.has(open)}
          onPin={() => togglePin(open)}
          onEdit={() => editDay(open)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
