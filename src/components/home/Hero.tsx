"use client";

import { useEffect, useState } from "react";
import { fmtDay } from "@/lib/dates";

const MOTTOS = ["Small steps still count.", "Progress, not perfection.", "Be curious today.", "Rest is part of the plan.", "Go outside for a little while.", "You are allowed to enjoy this.", "One good hour is a good hour."];
const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const manilaHour = (d: Date) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).format(d)) % 24;

/** The first screen: a frosted chip with the date, the live Manila clock and a greeting, over the scene. */
export function Hero({ today, name }: { today: string; name: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = manilaHour(now);
  const greet = hour < 5 ? "Still up?" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const motto = MOTTOS[parseInt(today.slice(-2), 10) % MOTTOS.length];

  return (
    <section className="home-hero" id="welcome" aria-labelledby="welcome-title">
      <div className="hero-chip">
        <div className="eyebrow">{fmtDay(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        <div className="hero-time" aria-label="Current time in Manila">
          {CLOCK.format(now)}
        </div>
        <p className="small muted" style={{ marginTop: 2 }}>
          Manila time
        </p>
        <h1 id="welcome-title" className="welcome-title">
          {greet}, {name || "friend"}.
        </h1>
        <p className="kicker" style={{ marginTop: 6 }}>
          Willow is here. {motto}
        </p>
      </div>
    </section>
  );
}
