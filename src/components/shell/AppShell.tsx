import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { NavLinks, NavList } from "./NavLinks";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="font-display mb-6 px-2 text-2xl">
          Willow
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          <Suspense fallback={<NavList variant="side" path={null} />}>
            <NavLinks variant="side" />
          </Suspense>
        </nav>
        <form action="/auth/signout" method="post">
          <button className="btn btn-sm w-full">Sign out</button>
        </form>
      </aside>
      <div className="min-w-0 flex-1 pb-16 md:pb-0">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden" aria-label="Main (mobile)">
        <Suspense fallback={<NavList variant="bottom" path={null} />}>
          <NavLinks variant="bottom" />
        </Suspense>
        <form action="/auth/signout" method="post" className="flex flex-1">
          <button className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted">
            <span aria-hidden className="text-lg">↩︎</span>
            Sign out
          </button>
        </form>
      </nav>
    </div>
  );
}
