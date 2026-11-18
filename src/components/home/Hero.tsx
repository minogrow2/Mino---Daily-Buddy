"use client";

import { useEffect, useState } from "react";
import { fmtDay } from "@/lib/dates";
import { MOTTOS } from "@/lib/willow/constants";

const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const manilaHour = (d: Date) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).format(d)) % 24;

/** The first screen: the date, the live Manila clock and a greeting. The scene shows behind it. */
export function Hero({ today, name }: { today: string; name: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = manilaHour(now);
  const greet = hour < 5 ? "Still up?" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const motto = MOTTOS[Number(today.slice(-2)) % MOTTOS.length];

  return (
    <section aria-labelledby="welcome-title" className="glass glass-butter relative p-6 sm:p-8">
      <span className="tape tape-left" aria-hidden />
      <p className="text-xs uppercase tracking-wide text-muted">
        {fmtDay(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
      <p className="font-display mt-1 text-4xl tabular-nums sm:text-5xl" aria-label="Current time in Manila">
        {CLOCK.format(now)}
      </p>
      <p className="text-xs text-muted">Manila time</p>
      <h1 id="welcome-title" className="font-display mt-4 text-3xl sm:text-4xl">
        {greet}, {name || "friend"}.
      </h1>
      <p className="mt-1 text-muted">Willow is here. {motto}</p>
    </section>
  );
}
