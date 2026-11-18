"use client";

import Link from "next/link";
import { useState } from "react";
import { DocLibrary } from "./DocLibrary";
import { Roadmap } from "./Roadmap";

export function ConceptsHome() {
  const [tab, setTab] = useState<"docs" | "roadmap">("docs");
  return (
    <div className="ft-bg">
      <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
        <header className="glass overflow-hidden">
          <div className="relative h-36 sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/ft/concepts.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
            <div className="relative flex h-full flex-col justify-end p-5 text-white">
              <Link href="/goals/finance-trading" className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur-md hover:bg-white/30">← Finance Trading</Link>
              <h1 className="font-display text-3xl sm:text-4xl">Concepts and Platforms</h1>
            </div>
          </div>
          <p className="p-4 text-sm text-muted">Your personal trading knowledge base: documents you write, and a learning roadmap you shape.</p>
        </header>
        <div className="glass inline-flex p-1" role="tablist" aria-label="Sections">
          {([["docs", "Documents"], ["roadmap", "Learning roadmap"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? "bg-sage-deep text-white" : "text-muted hover:text-fg"}`} style={tab === k ? { background: "var(--sage-deep)" } : undefined}>
              {l}
            </button>
          ))}
        </div>
        {tab === "docs" ? <DocLibrary kind="concept" basePath="/goals/finance-trading/concepts" noun="document" /> : <Roadmap />}
      </main>
    </div>
  );
}
