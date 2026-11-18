"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/", label: "Home", icon: "🏡" },
  { href: "/goals", label: "My Goals", icon: "🌱" },
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
              ? `rounded-xl px-3 py-2 text-sm transition ${active(n.href) ? "bg-pink text-fg font-medium" : "text-muted hover:bg-surface-2"}`
              : `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active(n.href) ? "text-rose font-medium" : "text-muted"}`
          }
        >
          <span aria-hidden className={variant === "side" ? "mr-2" : "text-lg"}>{n.icon}</span>
          {n.label}
        </Link>
      ))}
    </>
  );
}

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  return <NavList variant={variant} path={usePathname()} />;
}
