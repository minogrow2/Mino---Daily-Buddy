"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SVG = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Minimal line icons, matching the rest of the app (no emoji). */
const ICONS = {
  home: SVG(
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>,
  ),
  goals: SVG(
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3.2 2.2-5.2 5.5-5.2 0 3.2-2.2 5.2-5.5 5.2Z" />
      <path d="M12 15.5c0-3-2-4.8-5.2-4.8 0 3 2 4.8 5.2 4.8Z" />
    </>,
  ),
};

export const NAV: { href: string; label: string; icon: keyof typeof ICONS }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/goals", label: "My Goals", icon: "goals" },
];

/** `path` is null while the URL is unknown (prerender); links still render, just without the active highlight. */
export function NavList({ variant, path }: { variant: "side" | "bottom"; path: string | null }) {
  const active = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? "page" : undefined}
          className={
            variant === "side"
              ? `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${active(n.href) ? "bg-pink text-fg font-medium" : "text-muted hover:bg-surface-2"}`
              : `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active(n.href) ? "text-rose font-medium" : "text-muted"}`
          }
        >
          <span className="inline-flex">{ICONS[n.icon]}</span>
          {n.label}
        </Link>
      ))}
    </>
  );
}

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  return <NavList variant={variant} path={usePathname()} />;
}
