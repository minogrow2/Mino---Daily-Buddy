"use client";

import { useState } from "react";
import { dayTone, monthStat, type DayStat } from "@/lib/trading/metrics";
import { money } from "@/lib/trading/columns";
import { weekday } from "@/lib/dates";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shift(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const TONE: Record<string, { bg: string; border: string }> = {
  profit: { bg: "rgba(110,156,126,0.38)", border: "#6e9c7e" },
  loss: { bg: "rgba(169,83,95,0.22)", border: "#a9535f" },
  flat: { bg: "var(--sage-fill)", border: "#d6cdc4" },
  none: { bg: "var(--sage-fill)", border: "transparent" },
};

export function MonthCalendar({
  daily,
  today,
  initialYm,
  selected,
  onSelect,
  currency,
}: {
  daily: Record<string, DayStat>;
  today: string;
  initialYm: string;
  selected: string | null;
  onSelect: (day: string) => void;
  currency: string;
}) {
  const [ym, setYm] = useState(initialYm);
  const stat = monthStat(daily, ym, today);
  const [y, m] = ym.split("-").map(Number);
  const title = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekday(`${ym}-01`);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" aria-label="Previous month" onClick={() => setYm(shift(ym, -1))}>‹</button>
          <h3 className="font-display min-w-40 text-center text-xl">{title}</h3>
          <button className="btn btn-sm" aria-label="Next month" onClick={() => setYm(shift(ym, 1))}>›</button>
          <button className="btn btn-sm" onClick={() => setYm(today.slice(0, 7))}>Today</button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="tag">Net {money(stat.net, currency)}</span>
          <span className="tag">{stat.profitDays} profit days</span>
          <span className="tag">{stat.lossDays} losing days</span>
          <span className="tag">{stat.noTradeDays} no-trade days</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
        {WEEK.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} />;
          const s = daily[day];
          const tone = TONE[dayTone(s)];
          const future = day > today;
          const isSel = selected === day;
          return (
            <button
              key={day}
              type="button"
              disabled={future}
              onClick={() => onSelect(day)}
              aria-label={`${day}${s ? `, net ${money(s.net, currency)}, ${s.count} trades` : ", no trades"}`}
              className={`flex min-h-16 flex-col items-start rounded-xl border p-1.5 text-left transition hover:scale-[1.02] disabled:opacity-40 ${isSel ? "ring-2 ring-[var(--rose)]" : ""}`}
              style={{ background: tone.bg, borderColor: tone.border }}
            >
              <span className="text-xs font-medium text-fg">{Number(day.slice(8))}</span>
              {s && s.count > 0 && (
                <span className="mt-auto w-full truncate text-[11px] font-medium" style={{ color: s.net < 0 ? "#7d2f3a" : s.net > 0 ? "#2f5a40" : "var(--muted)" }}>
                  {money(s.net, currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
