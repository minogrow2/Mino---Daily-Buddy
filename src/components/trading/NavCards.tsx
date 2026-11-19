import Link from "next/link";

const CARDS = [
  { href: "/goals/finance-trading/concepts", title: "Concepts and Platforms", img: "concepts", live: true,
    blurb: "Study, document, and organize everything I learn about financial markets, trading concepts, platforms, and strategies." },
  { href: "/goals/finance-trading/backtesting", title: "Backtesting Logger", img: "logger", live: true,
    blurb: "Record and document every backtesting session with detailed explanations, screenshots, and observations." },
  { href: "/goals/finance-trading/analytics", title: "Backtesting Analytics", img: "analytics", live: true,
    blurb: "Analyze strategy performance through statistics, performance indicators, and a monthly profit-and-loss calendar." },
  { href: "/goals/finance-trading/live", title: "Live Trading", img: "live", live: true,
    blurb: "Manage actual trading activity, prop firm accounts, risk limits, and live trading performance." },
];

export function NavCards() {
  return (
    <nav aria-label="Finance Trading workspaces" className="grid gap-4 sm:grid-cols-2">
      {CARDS.map((c, i) => {
        const inner = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/ft/${c.img}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading={i < 2 ? "eager" : "lazy"} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
            <div className="relative flex h-full min-h-56 flex-col justify-end p-5 text-white sm:min-h-64">
              <span className="mb-2 w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-xs backdrop-blur-md">{c.live ? `0${i + 1}` : `0${i + 1} · Coming next`}</span>
              <h3 className="font-display text-2xl drop-shadow">{c.title}</h3>
              <p className="mt-1 max-w-md text-sm text-white/90 drop-shadow">{c.blurb}</p>
            </div>
          </>
        );
        return c.live ? (
          <Link key={c.href} href={c.href} className="group relative block overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow)] focus-visible:outline-2 focus-visible:outline-offset-2">
            {inner}
          </Link>
        ) : (
          <div key={c.href} aria-disabled="true" className="group relative block overflow-hidden rounded-[var(--radius)] opacity-80 saturate-50 shadow-[var(--shadow)]">
            {inner}
          </div>
        );
      })}
    </nav>
  );
}
