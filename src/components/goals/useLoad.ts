"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The loaded rows, and the ways to change them: edit shows a change at once, reload fetches again, fail shows the error and reloads. */
export type Ctx<T> = { data: T; edit: (fn: (d: T) => T) => void; reload: () => void; fail: (e: unknown) => void };

/** Loads rows when `key` changes, and again on reload. `ctx` is null until the first load has finished. */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });
  useEffect(() => {
    let alive = true;
    loader
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(errorText(e));
      });
    return () => {
      alive = false;
    };
  }, [key, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const edit = useCallback((fn: (d: T) => T) => setData((d) => (d === null ? d : fn(d))), []);
  const fail = useCallback((e: unknown) => {
    setError(errorText(e));
    setTick((t) => t + 1);
  }, []);
  const ctx: Ctx<T> | null = data === null ? null : { data, edit, reload, fail };
  return { ctx, error };
}
