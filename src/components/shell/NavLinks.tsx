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
export const ICONS = {
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
  calendar: SVG(
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>,
  ),
  history: SVG(
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>,
  ),
  analytics: SVG(
    <>
      <path d="M4 19h16" />
      <path d="M6 15l4-4 3 3 5-6" />
    </>,
  ),
  journal: SVG(
    <>
      <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" />
      <path d="M13.5 6.5l3 3" />
    </>,
  ),
  mood: SVG(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14a4 4 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </>,
  ),
  metime: SVG(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>,
  ),
  savings: SVG(
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 9.5h18M16 14h2.5" />
    </>,
  ),
  screen: SVG(
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>,
  ),
  techlab: SVG(
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
      <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
    </>,
  ),
  library: SVG(
    <>
      <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6.2l3.7-1 2.8 13-3.7 1z" />
    </>,
  ),
  settings: SVG(
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>,
  ),
};

type Item = { href: string; label: string; short?: string; icon: keyof typeof ICONS };

/** Every section, in the same order as the legacy menu. */
export const NAV: Item[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/goals", label: "My Goals", short: "Goals", icon: "goals" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/mood", label: "Mood", icon: "mood" },
  { href: "/metime", label: "Me Time", icon: "metime" },
  { href: "/savings", label: "Savings", icon: "savings" },
  { href: "/screen", label: "Screen Time", icon: "screen" },
  { href: "/techlab", label: "Tech Lab", icon: "techlab" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** The four shortcuts on the phone bar, as in the legacy app. */
export const BOTTOM_NAV: Item[] = NAV.filter((n) => ["/", "/goals", "/journal", "/mood"].includes(n.href));

/** `path` is null while the URL is unknown (prerender); links still render, just without the active highlight. */
export function NavList({ variant, path }: { variant: "side" | "bottom"; path: string | null }) {
  const active = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  const items = variant === "side" ? NAV : BOTTOM_NAV;
  return (
    <>
      {items.map((n) => (
        <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={variant === "side" ? "side-link" : "nav-btn"}>
          <span className={variant === "side" ? "inline-flex" : "ico"}>{ICONS[n.icon]}</span>
          {variant === "side" ? n.label : (n.short ?? n.label)}
        </Link>
      ))}
    </>
  );
}

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  return <NavList variant={variant} path={usePathname()} />;
}
