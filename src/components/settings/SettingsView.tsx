"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorNote } from "@/components/ui/Modal";
import { useLook } from "@/components/theme/ThemeProvider";
import { setChatJournal } from "@/lib/willow/actions";
import { loadSettings, type ThemeMode, type WillowSettings, type Colours } from "@/lib/willow/settings";
import { saveColours, saveName, saveReminders, saveScene, saveSavingsTarget, saveTheme } from "@/lib/willow/settings-actions";
import { ColourRows, NameForm, SavingsForm, ScenePicker } from "./Parts";

const message = (e: unknown) => (e instanceof Error ? e.message : "Could not save. Try again.");

/** The Settings page. Every control saves to the account at once; the look updates straight away and goes back if a save fails. */
export function SettingsView() {
  const { apply, preview } = useLook();
  const [s, setS] = useState<WillowSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadSettings()
      .then((v) => {
        if (alive) setS(v);
      })
      .catch((e) => {
        if (alive) setError(message(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!s) {
    return (
      <div className="grid">
        <div>
          <div className="eyebrow">Your account on Willow</div>
          <h1>Settings</h1>
        </div>
        <ErrorNote error={error} />
        {!error && <div className="empty">Opening Settings…</div>}
      </div>
    );
  }

  // Shows the next state, saves it, and puts the previous one back if the save fails.
  async function commit(next: WillowSettings, write: () => Promise<unknown>): Promise<boolean> {
    if (!s) return false;
    const prev = s;
    setError(null);
    setS(next);
    apply(next);
    try {
      await write();
      return true;
    } catch (e) {
      setS(prev);
      apply(prev);
      setError(message(e));
      return false;
    }
  }

  const pickScene = (page: "default" | "home", value: string) => {
    const scenes = { ...s.scenes };
    if (value === "") delete scenes[page];
    else scenes[page] = value;
    void commit({ ...s, scenes }, () => saveScene(page, value));
  };

  const setColours = (colours: Colours) => void commit({ ...s, colours }, () => saveColours(colours));

  return (
    <div className="grid">
      <div>
        <div className="eyebrow">Your account on Willow</div>
        <h1>Settings</h1>
      </div>
      <ErrorNote error={error} />

      <div className="grid two">
        <Card eyebrow="Profile" title="Profile and look">
          <NameForm initial={s.name} onSave={(name) => commit({ ...s, name }, () => saveName(name))} />
          <label style={{ display: "grid", gap: 5, marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
            Theme
            <select
              className="input"
              aria-label="Theme"
              value={s.theme}
              onChange={(e) => {
                const theme = e.target.value as ThemeMode;
                void commit({ ...s, theme }, () => saveTheme(theme));
              }}
            >
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </Card>

        <Card eyebrow="Savings" title="Savings target">
          <SavingsForm initial={s.savingsTarget} onSave={(n) => commit({ ...s, savingsTarget: n }, () => saveSavingsTarget(n))} />
        </Card>
      </div>

      <Card eyebrow="Backgrounds" title="Look">
        <p className="small muted">Pick the picture behind every page. “Plain cream” shows none.</p>
        <p className="eyebrow" style={{ marginTop: 14 }}>
          All pages
        </p>
        <ScenePicker value={s.scenes.default ?? "none"} onPick={(v) => pickScene("default", v)} />
        <p className="eyebrow" style={{ marginTop: 14 }}>
          Home
        </p>
        <ScenePicker value={s.scenes.home ?? ""} inherit="Same as all pages" onPick={(v) => pickScene("home", v)} />
      </Card>

      <Card eyebrow="Look" title="Your colours">
        <ColourRows colours={s.colours} onSet={setColours} onPreview={(colours) => preview({ ...s, colours })} />
        <p className="small muted" style={{ marginTop: 10 }}>
          Changes show straight away and are saved to your account.
        </p>
      </Card>

      <Card eyebrow="Willow" title="Willow chat and reminders">
        <label className="check-row small">
          <input
            type="checkbox"
            checked={s.chatJournal}
            onChange={(e) => {
              const on = e.target.checked;
              void commit({ ...s, chatJournal: on }, () => setChatJournal(on));
            }}
          />{" "}
          Let Willow read my last five journal entries. Off by default.
        </label>
        <label className="check-row small" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={s.reminders}
            onChange={(e) => {
              const on = e.target.checked;
              void commit({ ...s, reminders: on }, () => saveReminders(on));
            }}
          />{" "}
          Show one gentle reminder a day after 10:00 Manila time.
        </label>
        <p className="small muted" style={{ marginTop: 14 }}>
          Willow’s chat key is set on the server, in the site’s settings. It is not shown here or stored in your account.
        </p>
      </Card>
    </div>
  );
}
