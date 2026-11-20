"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { todayYMD } from "@/lib/dates";
import { REMINDERS } from "@/lib/willow/metime";
import { loadSettings } from "@/lib/willow/settings";

/** Same key as the legacy app, so a dismissal made there still counts. */
const KEY = "mino.reminded";

function manilaHour(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "numeric", hourCycle: "h23" }).format(new Date()));
}

function dismissedToday(): boolean {
  try {
    return localStorage.getItem(KEY) === todayYMD();
  } catch {
    return false;
  }
}

/** One gentle reminder a day, after 10:00 Manila time, shown as a dismissible banner. Off when the Settings toggle is off. */
export function ReminderBanner() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const [due, setDue] = useState(false);
  const [text, setText] = useState("");

  // The setting is read again on each page change, so turning it off in Settings hides the banner.
  useEffect(() => {
    let live = true;
    loadSettings()
      .then((s) => {
        if (live) setOn(s.reminders);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);

  useEffect(() => {
    const check = () => {
      setDue(on && manilaHour() >= 10 && !dismissedToday());
      setText(REMINDERS[parseInt(todayYMD().slice(-2), 10) % REMINDERS.length]);
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [on]);

  if (!on || !due) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, todayYMD());
    } catch {
      // Storage blocked: the banner returns tomorrow at worst.
    }
    setDue(false);
  }

  return (
    <section className="card" role="status" style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <p style={{ margin: 0 }}>{text}</p>
      <button type="button" className="wbtn ghost small" onClick={dismiss}>
        Dismiss
      </button>
    </section>
  );
}
