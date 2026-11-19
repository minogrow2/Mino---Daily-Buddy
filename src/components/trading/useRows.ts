"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signedUrls } from "@/lib/media";

// Postgres sends numeric columns as strings. Convert them so calculations and averages see real numbers.
const NUMERIC_KEYS = ["pl", "fee", "rr", "lot_size", "stop_loss", "take_profit", "starting_balance", "target_pl", "account_size", "max_daily_loss", "max_daily_loss_pct", "max_overall_loss", "max_overall_loss_pct", "profit_target", "unrealized_pl"];
function normalizeNumbers(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const k of NUMERIC_KEYS) if (typeof out[k] === "string") out[k] = Number(out[k]);
  return out;
}

type Filter = { field: string; value: string } | null;
type Order = { column: string; ascending?: boolean }[];

/**
 * Loads rows from one table (optionally filtered to one parent) and fresh signed URLs for their screenshots.
 * Pass `filter` as null to load everything for the user (used by the strategy comparison).
 */
export function useRows<T extends { id: string; screenshot_id?: string | null }>(table: string, filter: Filter, order: Order = []) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([table, filter, order]);

  const reload = useCallback(async () => {
    const [tbl, f, o] = JSON.parse(key) as [string, Filter, Order];
    if (f && !f.value) return;
    let q = createClient().from(tbl).select("*");
    if (f) q = q.eq(f.field, f.value);
    for (const ord of o) q = q.order(ord.column, { ascending: ord.ascending ?? true });
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    const list = ((data ?? []) as Record<string, unknown>[]).map(normalizeNumbers) as unknown as T[];
    setRows(list);
    const ids = list.map((r) => r.screenshot_id).filter((x): x is string => !!x);
    setUrls(ids.length ? await signedUrls(ids) : {});
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    reload();
  }, [reload]);

  return { rows, urls, error, reload };
}
