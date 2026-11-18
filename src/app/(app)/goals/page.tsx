import Link from "next/link";

const GOALS = [
  { id: "trading", n: "01", title: "Finance Trading", blurb: "Learn markets, document strategies, backtest and track performance.", href: "/goals/finance-trading" },
  { id: "ai", n: "02", title: "Learn AI", blurb: "Explore AI tools, agents and automation." },
  { id: "glow", n: "03", title: "Glow Up", blurb: "Daily self-care habits, movement and wardrobe." },
  { id: "tech", n: "04", title: "Tech Development and Reverse Engineering", blurb: "Projects, home lab and security practice." },
  { id: "money", n: "05", title: "Internet Money", blurb: "Preparation phase until you activate it." },
  { id: "reading", n: "06", title: "Watch and Read", blurb: "A library of meaningful content." },
  { id: "cs", n: "07", title: "CS Student Advantage", blurb: "Courses, practice and portfolio." },
];

export default function GoalsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="font-display text-4xl">My Goals</h1>
        <p className="mt-1 text-muted">Seven goals, one at a time.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {GOALS.map((g) =>
          g.href ? (
            <Link key={g.id} href={g.href} className="glass block p-5 transition hover:-translate-y-0.5">
              <span className="tag">{g.n}</span>
              <h2 className="font-display mt-2 text-xl">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.blurb}</p>
            </Link>
          ) : (
            <div key={g.id} className="glass p-5 opacity-60" aria-disabled="true">
              <span className="tag">{g.n}</span>
              <h2 className="font-display mt-2 text-xl">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.blurb}</p>
              <p className="mt-2 text-xs text-muted">Moves over from the old Willow app in a later stage.</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
