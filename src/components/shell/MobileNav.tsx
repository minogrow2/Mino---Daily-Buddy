"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BOTTOM_NAV, ICONS, NAV, NavList } from "./NavLinks";

const isActive = (path: string | null, href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));

/** Phone bar: the four shortcuts, then More, which opens every section in a sheet (as the legacy app did). */
export function MobileNav({ path }: { path: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const moreActive = NAV.some((n) => !BOTTOM_NAV.includes(n) && isActive(path, n.href));

  return (
    <>
      <nav className="bottom-nav" aria-label="Main (mobile)">
        <NavList variant="bottom" path={path} />
        <button
          type="button"
          className="nav-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setOpen(true)}
        >
          <span className="ico" aria-hidden="true">≡</span>
          More
        </button>
      </nav>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="All sections">
            <div className="card-head">
              <div>
                <h2>Everywhere in Willow</h2>
              </div>
              <button type="button" className="wbtn ghost small" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="more-grid">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={isActive(path, n.href) ? "page" : undefined}>
                  <span aria-hidden="true" style={{ fontSize: 18 }}>
                    {ICONS[n.icon]}
                  </span>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Reads the route in its own Suspense boundary, as the sidebar links do. */
export function MobileNavRoute() {
  return <MobileNav path={usePathname()} />;
}
