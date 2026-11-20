// Settings for the Settings page and the look of every page. Read from the signed-in person's user_settings row (RLS scopes it). Legacy defaults, as in the legacy app.
import { createClient } from "@/lib/supabase/client";

export type ThemeMode = "system" | "light" | "dark";
export type ColourGroup = "big" | "small" | "main";
export type Colours = Partial<Record<ColourGroup, string>>;
/** Scene keys by page: "default" (all pages) and "home"; goal-<id> keys are kept as they are. "none" is plain cream. */
export type Scenes = Record<string, string>;

export type WillowSettings = {
  name: string;
  theme: ThemeMode;
  colours: Colours;
  savingsTarget: number;
  scenes: Scenes;
  chatJournal: boolean;
  reminders: boolean;
};

export const DEFAULT_SCENES: Scenes = { default: "hollow", home: "pond" };
export const DEFAULT_SETTINGS: WillowSettings = {
  name: "",
  theme: "system",
  colours: {},
  savingsTarget: 1000,
  scenes: DEFAULT_SCENES,
  chatJournal: false,
  reminders: true,
};

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Reads the signed-in person's settings. With no row yet, the legacy defaults are returned. */
async function fetchSettings(): Promise<WillowSettings> {
  const { data, error } = await createClient()
    .from("user_settings")
    .select("theme,scenes,chat_journal,reminders,extra")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_SETTINGS;

  const extra = isObject(data.extra) ? data.extra : {};
  const rawColours = isObject(extra.colors) ? extra.colors : {};
  const colours: Colours = {};
  for (const g of ["big", "small", "main"] as const) {
    if (isHex(rawColours[g])) colours[g] = rawColours[g].toLowerCase();
  }
  const scenes: Scenes = {};
  if (isObject(data.scenes)) {
    for (const [k, v] of Object.entries(data.scenes)) if (typeof v === "string") scenes[k] = v;
  }

  return {
    name: typeof extra.name === "string" ? extra.name : "",
    theme: data.theme === "light" || data.theme === "dark" ? data.theme : "system",
    colours,
    savingsTarget: typeof extra.savingsTarget === "number" ? extra.savingsTarget : 1000,
    scenes: isObject(data.scenes) ? scenes : DEFAULT_SCENES,
    chatJournal: !!data.chat_journal,
    reminders: data.reminders !== false,
  };
}

/* A short-lived copy, so the theme, the reminder banner and the goal backgrounds do not each re-read the settings on every page change.
   Any save clears it, and the copy lasts at most a minute. */
const SETTINGS_TTL_MS = 60_000;
let settingsCopy: { at: number; value: Promise<WillowSettings> } | null = null;

/** Drops the copy so the next read is fresh. Every settings write calls this. */
export function invalidateSettings() {
  settingsCopy = null;
}

/** The signed-in person's settings, from the copy when it is fresh. */
export function loadSettings(): Promise<WillowSettings> {
  if (settingsCopy && Date.now() - settingsCopy.at < SETTINGS_TTL_MS) return settingsCopy.value;
  const value = fetchSettings();
  const entry = { at: Date.now(), value };
  settingsCopy = entry;
  value.catch(() => {
    if (settingsCopy === entry) settingsCopy = null;
  });
  return value;
}
