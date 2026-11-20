"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/trading/columns";
import type { EquityPoint } from "@/lib/trading/metrics";

const SAGE = "#3f6b50";
const SAGE_LIGHT = "#9ccaa9";
const ROSE = "#a9535f";
const BUTTER = "#e2be5e";
const GRID = "rgba(61,46,42,0.12)";

const tipStyle = { borderRadius: 12, border: "1px solid #eadfd6", background: "#fffdf9", fontSize: 12 };

export function EquityChart({ points, start, currency, mode }: { points: EquityPoint[]; start: number; currency: string; mode: "equity" | "cumulative" }) {
  const data = [{ index: 0, value: mode === "equity" ? start : 0 }, ...points.map((p) => ({ index: p.index, value: mode === "equity" ? p.equity : p.cumPL }))];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAGE_LIGHT} stopOpacity={0.6} />
            <stop offset="100%" stopColor={SAGE_LIGHT} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="index" tick={{ fontSize: 11 }} label={{ value: "Trade #", position: "insideBottom", offset: -2, fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => money(Number(v), currency)} />
        <Tooltip contentStyle={tipStyle} formatter={(v) => money(Number(v), currency)} labelFormatter={(l) => `Trade ${l}`} />
        {mode === "equity" && <ReferenceLine y={start} stroke={ROSE} strokeDasharray="4 4" />}
        <Area type="monotone" dataKey="value" stroke={SAGE} strokeWidth={2.5} fill="url(#eqfill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SessionChart({ data, currency }: { data: { session: string; net: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="session" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => money(Number(v), currency)} />
        <Tooltip contentStyle={tipStyle} formatter={(v) => money(Number(v), currency)} />
        <Bar dataKey="net" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.session} fill={d.net >= 0 ? SAGE : ROSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyChart({ data, currency }: { data: { ym: string; net: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => money(Number(v), currency)} />
        <Tooltip contentStyle={tipStyle} formatter={(v) => money(Number(v), currency)} />
        <Bar dataKey="net" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.ym} fill={d.net >= 0 ? SAGE : ROSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionDonut({ wins, losses, breakeven }: { wins: number; losses: number; breakeven: number }) {
  const data = [
    { name: "Wins", value: wins, color: SAGE },
    { name: "Losses", value: losses, color: ROSE },
    { name: "Breakeven", value: breakeven, color: BUTTER },
  ].filter((d) => d.value > 0);
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No wins, losses or breakeven trades yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
