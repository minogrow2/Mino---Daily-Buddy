import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { NavLinks, NavList } from "./NavLinks";
import { MobileNav, MobileNavRoute } from "./MobileNav";
import { ReminderBanner } from "./ReminderBanner";

/** The legacy shell: a sidebar on wide screens, a top bar and a bottom bar on phones, one scrolling column of cards. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Sections">
        <Link href="/" className="brand" style={{ display: "block", margin: "6px 10px 18px" }}>
          Willow
        </Link>
        <nav style={{ display: "grid", gap: 4 }} aria-label="Main">
          <Suspense fallback={<NavList variant="side" path={null} />}>
            <NavLinks variant="side" />
          </Suspense>
        </nav>
        <form action="/auth/signout" method="post" style={{ marginTop: "auto" }}>
          <button type="submit" className="side-link" style={{ width: "100%", background: "none", border: 0, textAlign: "left" }}>
            Sign out
          </button>
        </form>
      </aside>
      <main className="main">
        <div className="topbar">
          <Link href="/" className="brand">
            Willow
          </Link>
          <span className="status-dot" role="status" aria-live="polite">
            Saved to your account
          </span>
        </div>
        <Suspense fallback={null}>
          <ReminderBanner />
        </Suspense>
        {children}
        <p className="small muted" style={{ marginTop: 28, textAlign: "center" }}>
          Willow is a companion, not a boss. Put the phone down and go outside for a while.
        </p>
      </main>
      <Suspense fallback={<MobileNav path={null} />}>
        <MobileNavRoute />
      </Suspense>
    </div>
  );
}
