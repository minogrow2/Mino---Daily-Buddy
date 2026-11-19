"use client";

import Link from "next/link";
import { useState } from "react";
import { DocLibrary } from "../DocLibrary";

const TABS = [
  { key: "sessions", label: "Sessions" },
  { key: "templates", label: "Templates" },
] as const;

/** The Backtesting Logger: a library of session documents, plus reusable templates. */
export function BacktestingHome() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("sessions");
  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
        <header className="glass overflow-hidden">
          <div className="relative h-36 sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/ft/logger.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
            <div className="relative flex h-full flex-col justify-end p-5 text-white">
              <Link href="/goals/finance-trading" className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur-md hover:bg-white/30">← Finance Trading</Link>
              <h1 className="font-display text-3xl sm:text-4xl">Backtesting Logger</h1>
            </div>
          </div>
          <p className="p-4 text-sm text-muted">Write up each backtesting session with its reasoning, screenshots and lessons. Start from a template to keep every session consistent.</p>
        </header>
        <div className="glass inline-flex p-1" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t.key ? "text-white" : "text-muted hover:text-fg"}`} style={tab === t.key ? { background: "var(--sage-deep)" } : undefined}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "sessions"
          ? <DocLibrary kind="backtest" basePath="/goals/finance-trading/backtesting" noun="session" />
          : <DocLibrary kind="template" basePath="/goals/finance-trading/backtesting/templates" noun="template" />}
      </main>
    </div>
  );
}
