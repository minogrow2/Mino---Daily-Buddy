// The look: the three colour groups (ported from the legacy "Your colours"), the scene pictures, and the mapping from choices to CSS custom properties. Only overrides are set; willow.css keeps the defaults.
import type { ColourGroup, Colours, Scenes, ThemeMode, WillowSettings } from "@/lib/willow/settings";

export const COLOUR_GROUPS: Record<ColourGroup, { label: string; hint: string; fallback: string; presets: [string, string][] }> = {
  big: {
    label: "Big boxes",
    hint: "The large cards behind each page.",
    fallback: "#f6f7ee",
    presets: [["#f6f7ee", "Cream glass"], ["#fffdf9", "Paper"], ["#e6f0fa", "Sky"], ["#f2eaf8", "Lilac"], ["#2c2320", "Cocoa"]],
  },
  small: {
    label: "Small boxes",
    hint: "Mood buttons, tick boxes, inputs, calendar and heatmap squares.",
    fallback: "#a6c29f",
    presets: [["#a6c29f", "Sage"], ["#a9c6e0", "Blue"], ["#f2c6a8", "Peach"], ["#c9b8e6", "Lavender"], ["#e9d98c", "Butter"]],
  },
  main: {
    label: "Main colour",
    hint: "Solid buttons, selected states and the highlights.",
    fallback: "#a9535f",
    presets: [["#a9535f", "Rose"], ["#7d4a8c", "Plum"], ["#3f7f7a", "Teal"], ["#d9735b", "Coral"], ["#3e5c8a", "Navy"]],
  },
};

/** The legacy scene list, in legacy order. Files are in /public/img/willow. */
export const SCENES: { key: string; label: string; file: string; thumb: string }[] = [
  { key: "pond", label: "Fishing by the pond", file: "scene-fishing.jpg", thumb: "thumb-fishing.jpg" },
  { key: "desk", label: "Reading at the desk", file: "scene-desk.jpg", thumb: "thumb-desk.jpg" },
  { key: "bath", label: "Bathhouse", file: "scene-bath.jpg", thumb: "thumb-bath.jpg" },
  { key: "hill", label: "Grassy hill", file: "scene-grass.jpg", thumb: "thumb-grass.jpg" },
  { key: "hollow", label: "Forest hollow", file: "scene-hollow.jpg", thumb: "thumb-hollow.jpg" },
  { key: "sunset", label: "Running at sunset", file: "bg-000.jpg", thumb: "thumb-000.jpg" },
  { key: "umbrella", label: "Under a big umbrella", file: "bg-003.jpg", thumb: "thumb-003.jpg" },
  { key: "nightforest", label: "Glowing forest at night", file: "bg-004.jpg", thumb: "thumb-004.jpg" },
  { key: "straw", label: "Straw hat in the grass", file: "bg-005.jpg", thumb: "thumb-005.jpg" },
  { key: "redhouse", label: "Red bathhouse and dragon", file: "bg-006.jpg", thumb: "thumb-006.jpg" },
  { key: "neon", label: "Neon city at night", file: "goal-cs.jpg", thumb: "thumb-007.jpg" },
  { key: "mosaic", label: "Mosaic forest", file: "bg-010.jpg", thumb: "thumb-010.jpg" },
  { key: "bookshop", label: "Book shop with a cat", file: "goal-reading.jpg", thumb: "thumb-011.jpg" },
  { key: "shrine", label: "Quiet shrine in the forest", file: "bg-012.jpg", thumb: "thumb-012.jpg" },
  { key: "pinkcrowd", label: "Pink crowd by the water", file: "bg-013.jpg", thumb: "thumb-013.jpg" },
  { key: "flying", label: "Girl flying over clouds", file: "bg-014.jpg", thumb: "thumb-014.jpg" },
].map((s) => ({ ...s, file: `/img/willow/${s.file}`, thumb: `/img/willow/${s.thumb}` }));

/** Every custom property the look can set. Each is removed when its colour is not chosen. */
export const LOOK_VARS = [
  "--card-fill", "--card-ink", "--card-muted",
  "--sage", "--sage-line", "--fill-soft", "--fill-deep",
  "--rose", "--rose-ink", "--pink", "--pink-soft",
];

const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixColour = (a: string, b: string, t: number) => {
  const A = hexRgb(a), B = hexRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
/** Dark text on light colours, light text on dark ones. */
const inkFor = (h: string) => {
  const [r, g, b] = hexRgb(h);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#3d2e2a" : "#ffffff";
};

export function isDarkNow(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** The custom properties for the chosen colours, as the legacy app computed them. Big boxes keep their text readable. */
export function lookVars(colours: Colours, dark: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  const base = dark ? "#2c2320" : "#ffffff";
  const backdrop = dark ? "#2c2320" : "#f6f7ee";
  const { big, small, main } = colours;
  if (big) {
    const cardColour = mixColour(big, backdrop, 0.4);
    const ink = inkFor(cardColour);
    out["--card-fill"] = `color-mix(in srgb, ${big} 60%, transparent)`;
    out["--card-ink"] = ink;
    out["--card-muted"] = mixColour(ink, cardColour, 0.35);
  }
  if (small) {
    out["--sage"] = small;
    out["--sage-line"] = mixColour(small, "#000000", 0.3);
    out["--fill-soft"] = small;
    out["--fill-deep"] = mixColour(small, "#000000", 0.12);
  }
  if (main) {
    out["--rose"] = main;
    out["--rose-ink"] = inkFor(main);
    out["--pink"] = mixColour(main, base, dark ? 0.7 : 0.72);
    out["--pink-soft"] = mixColour(main, base, dark ? 0.84 : 0.88);
  }
  return out;
}

/** The scene key for a page: "home" on the home page, "default" elsewhere. Blank means inherit the default. Unknown keys mean plain cream. */
export function sceneKeyFor(scenes: Scenes, page: "home" | "default"): string {
  let v = scenes[page];
  if (v === undefined || v === "") v = scenes.default;
  const hit = SCENES.find((s) => s.key === v);
  return hit ? hit.key : "none";
}

export function sceneCss(key: string): string {
  const hit = SCENES.find((s) => s.key === key);
  return hit ? `url("${hit.file}")` : "none";
}

export const CACHE_KEY = "willow.look";

type SceneRef = { k: string; u: string };
/** What the boot script needs to paint before the first frame: the mode, both colour sets, and the two scenes. */
export type LookCache = {
  m: ThemeMode;
  l: Record<string, string>;
  d: Record<string, string>;
  h: SceneRef;
  a: SceneRef;
};

export function lookCache(s: Pick<WillowSettings, "theme" | "colours" | "scenes">): LookCache {
  const ref = (page: "home" | "default"): SceneRef => {
    const k = sceneKeyFor(s.scenes, page);
    return { k, u: sceneCss(k) };
  };
  return { m: s.theme, l: lookVars(s.colours, false), d: lookVars(s.colours, true), h: ref("home"), a: ref("default") };
}

/* Runs as the browser parses the page, before the first paint: puts back the last look shown in this browser. The saved settings load right after and win. Only our own cache is read. */
export const LOOK_BOOT_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem("${CACHE_KEY}")||"null");if(!c)return;var r=document.documentElement;if(c.m==="light"||c.m==="dark")r.setAttribute("data-theme",c.m);var d=c.m==="dark"||(c.m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var v=d?c.d:c.l;for(var k in v)r.style.setProperty(k,v[k]);var p=location.pathname==="/"?c.h:c.a;r.dataset.scene=p.k;var s=document.createElement("style");s.textContent="#scene{--scene-img:"+p.u+"}";document.head.appendChild(s);}catch(e){}})();`;
