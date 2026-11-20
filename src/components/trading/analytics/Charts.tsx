"use client";

import dynamic from "next/dynamic";

/** The recharts code loads after the page paints, so the rest of the app never waits for it. */
function ChartPlaceholder() {
  return <div style={{ minHeight: 220 }} aria-busy="true" />;
}

export const EquityChart = dynamic(() => import("./ChartsBody").then((m) => m.EquityChart), { ssr: false, loading: ChartPlaceholder });
export const SessionChart = dynamic(() => import("./ChartsBody").then((m) => m.SessionChart), { ssr: false, loading: ChartPlaceholder });
export const MonthlyChart = dynamic(() => import("./ChartsBody").then((m) => m.MonthlyChart), { ssr: false, loading: ChartPlaceholder });
export const DistributionDonut = dynamic(() => import("./ChartsBody").then((m) => m.DistributionDonut), { ssr: false, loading: ChartPlaceholder });
