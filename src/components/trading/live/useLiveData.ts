"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Account = {
  id: string;
  firm_name: string;
  account_label: string;
  currency: string;
  account_size: number;
  starting_balance: number;
  max_daily_loss: number | null;
  max_daily_loss_pct: number | null;
  max_overall_loss: number | null;
  max_overall_loss_pct: number | null;
  drawdown_type: "static" | "trailing";
  daily_loss_basis: "account_size" | "balance";
  include_floating: boolean;
  include_fees: boolean;
  profit_target: number | null;
  max_trades_per_day: number | null;
  reset_timezone: string;
  reset_time: string;
  warn_low: number;
  warn_high: number;
  unrealized_pl: number;
  status: "active" | "passed" | "breached" | "archived";
  columns: unknown;
  notes: string;
  created_at: string;
};

export type LiveSettings = { activated: boolean; activated_at: string | null; checklist: string[] };

const NUMERIC = ["account_size", "starting_balance", "max_daily_loss", "max_daily_loss_pct", "max_overall_loss", "max_overall_loss_pct", "profit_target", "unrealized_pl"] as const;

function toAccount(row: Record<string, unknown>): Account {
  const out = { ...row } as Record<string, unknown>;
  for (const k of NUMERIC) if (out[k] !== null && out[k] !== undefined) out[k] = Number(out[k]);
  return out as unknown as Account;
}

/** Whether live trading is switched on for this user, and the pre-trade checklist. */
export function useLiveSettings() {
  const [settings, setSettings] = useState<LiveSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const { data, error } = await createClient().from("live_settings").select("activated,activated_at,checklist").maybeSingle();
    if (error) return setError(error.message);
    setError(null);
    setSettings({
      activated: data?.activated ?? false,
      activated_at: data?.activated_at ?? null,
      checklist: Array.isArray(data?.checklist) ? (data.checklist as string[]) : [],
    });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    reload();
  }, [reload]);
  return { settings, error, reload, setError };
}

/** One prop firm account by id. `missing` is true when it doesn't exist or isn't the user's. */
export function useAccount(id: string) {
  const [account, setAccount] = useState<Account | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const { data, error } = await createClient().from("prop_accounts").select("*").eq("id", id).maybeSingle();
    if (error) return setError(error.message);
    if (!data) return setMissing(true);
    setError(null);
    setAccount(toAccount(data as Record<string, unknown>));
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state is set after the await
    reload();
  }, [reload]);
  return { account, missing, error, reload, setError };
}

export const toAccountRow = toAccount;
