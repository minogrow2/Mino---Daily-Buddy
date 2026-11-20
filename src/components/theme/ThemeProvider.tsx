"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_SETTINGS, loadSettings, type WillowSettings } from "@/lib/willow/settings";
import { CACHE_KEY, LOOK_VARS, isDarkNow, lookCache, lookVars, sceneCss, sceneKeyFor, sceneSlot } from "./look";

type LookApi = {
  /** Paints the look and remembers it in this browser. Used after a save. */
  apply: (s: WillowSettings) => void;
  /** Paints the look without remembering it. Used while a colour is being dragged. */
  preview: (s: WillowSettings) => void;
};
const LookContext = createContext<LookApi>({ apply: () => {}, preview: () => {} });
export const useLook = () => useContext(LookContext);

/** Sets the mode attribute, the colour overrides, and the scene on the page root. */
function paint(s: WillowSettings, path: string) {
  const root = document.documentElement;
  if (s.theme === "light" || s.theme === "dark") root.setAttribute("data-theme", s.theme);
  else root.removeAttribute("data-theme");

  const vars = lookVars(s.colours, isDarkNow(s.theme));
  for (const name of LOOK_VARS) {
    const v = vars[name];
    if (v) root.style.setProperty(name, v);
    else root.style.removeProperty(name);
  }

  const key = sceneKeyFor(s.scenes, sceneSlot(path));
  root.dataset.scene = key;
  document.getElementById("scene")?.style.setProperty("--scene-img", sceneCss(key));
}

function remember(s: WillowSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(lookCache(s)));
  } catch {
    // Private windows and blocked storage: the look still applies, it just is not remembered.
  }
}

/** Reads the route in its own Suspense boundary, so the rest of the root layout can still be prerendered. */
function RouteWatch({ onPath }: { onPath: (path: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onPath(pathname), [pathname, onPath]);
  return null;
}

/** Mounted once in the root layout. Loads the saved look after mount; the boot script has already shown the last one. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const current = useRef<WillowSettings>(DEFAULT_SETTINGS);
  const path = useRef("/");
  const loaded = useRef(false);

  const apply = useCallback((s: WillowSettings) => {
    current.current = s;
    loaded.current = true;
    paint(s, path.current);
    remember(s);
  }, []);

  const preview = useCallback((s: WillowSettings) => {
    paint(s, path.current);
  }, []);

  // Route change: the scene follows the page. Before the saved settings load, the boot look stays.
  const onPath = useCallback((p: string) => {
    path.current = p;
    if (loaded.current) paint(current.current, p);
  }, []);

  useEffect(() => {
    let alive = true;
    loadSettings()
      .then((s) => {
        if (alive) apply(s);
      })
      .catch(() => {
        // Not signed in, or offline: keep the look already shown.
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  // System mode follows the device's light or dark setting while the page is open.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (loaded.current) paint(current.current, path.current);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(() => ({ apply, preview }), [apply, preview]);
  return (
    <LookContext.Provider value={value}>
      <Suspense fallback={null}>
        <RouteWatch onPath={onPath} />
      </Suspense>
      {children}
    </LookContext.Provider>
  );
}
