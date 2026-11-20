"use client";

import { useEffect, useState } from "react";
import { useLook } from "@/components/theme/ThemeProvider";
import { SCENES } from "@/components/theme/look";
import { loadSettings, type WillowSettings } from "@/lib/willow/settings";
import { saveScene } from "@/lib/willow/settings-actions";
import { ErrorNote } from "@/components/ui/Modal";
import type { GoalKey } from "@/lib/willow/constants";

/** Background for one goal page. "Same as all pages" removes the choice so the goal follows the default scene. */
export function GoalBackground({ goal }: { goal: GoalKey }) {
  const look = useLook();
  const [s, setS] = useState<WillowSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `goal-${goal}`;

  useEffect(() => {
    let live = true;
    loadSettings()
      .then((v) => {
        if (live) setS(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!s) return null;
  const value = s.scenes[key] ?? "";

  function pick(v: string) {
    if (!s) return;
    const scenes = { ...s.scenes };
    if (v === "") delete scenes[key];
    else scenes[key] = v;
    const next = { ...s, scenes };
    setS(next);
    look.apply(next);
    setError(null);
    saveScene(key, v).catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not save the background."));
  }

  return (
    <>
      <label className="small muted row-inline" style={{ gap: 8 }}>
        Background
        <select className="winput" style={{ width: "auto" }} value={value} onChange={(e) => pick(e.target.value)} aria-label="Background for this goal">
          <option value="">Same as all pages</option>
          <option value="none">Plain cream</option>
          {SCENES.map((sc) => (
            <option key={sc.key} value={sc.key}>
              {sc.label}
            </option>
          ))}
        </select>
      </label>
      <ErrorNote error={error} />
    </>
  );
}
