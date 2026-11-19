"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/ui/Modal";
import { COLOUR_GROUPS, SCENES } from "@/components/theme/look";
import type { ColourGroup, Colours } from "@/lib/willow/settings";

/** The name Willow uses. Saved on submit. */
export function NameForm({ initial, onSave }: { initial: string; onSave: (name: string) => Promise<boolean> }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = value.trim().slice(0, 40);
    setValue(name);
    setSaved(await onSave(name));
  }

  return (
    <form className="dlg" style={{ padding: 0 }} onSubmit={submit}>
      <label>
        What should Willow call you?
        <input
          className="input"
          name="name"
          maxLength={40}
          value={value}
          placeholder="Your first name"
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <button className="wbtn primary small" type="submit">
          Save name
        </button>
      </div>
      {saved && (
        <p className="small muted" role="status">
          Name saved.
        </p>
      )}
    </form>
  );
}

/** The savings target in pesos: a whole number, zero or more. Saved on submit. */
export function SavingsForm({ initial, onSave }: { initial: number; onSave: (n: number) => Promise<boolean> }) {
  const [value, setValue] = useState(String(initial));
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === "" || !Number.isInteger(n) || n < 0 || n > 2147483647) {
      setNote(null);
      setError("Enter a whole number of pesos, zero or more.");
      return;
    }
    setError(null);
    setNote((await onSave(n)) ? "Savings target saved." : null);
  }

  return (
    <form className="dlg" style={{ padding: 0 }} onSubmit={submit}>
      <label>
        Savings target (₱)
        <input
          className="input"
          name="target"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
        />
      </label>
      <p className="small muted" style={{ marginTop: 8 }}>
        Your savings goal in pesos. The Savings page reads this number.
      </p>
      <ErrorNote error={error} />
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <button className="wbtn primary small" type="submit">
          Save target
        </button>
      </div>
      {note && (
        <p className="small muted" role="status">
          {note}
        </p>
      )}
    </form>
  );
}

/** Thumbnail picker. Value "" means inherit (only when `inherit` is given), "none" means plain cream, otherwise a scene key. */
export function ScenePicker({ value, inherit, onPick }: { value: string; inherit?: string; onPick: (v: string) => void }) {
  const tile = (v: string, label: string, thumb?: string) => (
    <button
      key={v || "inherit"}
      type="button"
      className={`scene-tile${value === v ? " on" : ""}`}
      aria-pressed={value === v}
      onClick={() => onPick(v)}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- static scene thumbnails from /public
        <img src={thumb} alt="" loading="lazy" />
      ) : (
        <span className="scene-plain" aria-hidden="true" />
      )}
      <span className="scene-label">{label}</span>
    </button>
  );
  return (
    <div className="scene-grid">
      {inherit !== undefined && tile("", inherit)}
      {tile("none", "Plain cream")}
      {SCENES.map((sc) => tile(sc.key, sc.label, sc.thumb))}
    </div>
  );
}

/** The native colour picker. Dragging previews; choosing a colour (the picker closing) saves it. */
function CustomColour({ label, value, onPreview, onCommit }: { label: string; value: string; onPreview: (hex: string) => void; onCommit: (hex: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const done = () => onCommit(el.value);
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  }, [onCommit]);

  return (
    <label className="colour-custom">
      <input
        ref={ref}
        type="color"
        defaultValue={value}
        aria-label={label}
        onInput={(e) => onPreview(e.currentTarget.value)}
      />
      Any colour
    </label>
  );
}

/** The three colour groups with their presets, as in the legacy "Your colours". */
export function ColourRows({
  colours,
  onSet,
  onPreview,
}: {
  colours: Colours;
  onSet: (next: Colours) => void;
  onPreview: (next: Colours) => void;
}) {
  const anySet = Object.keys(colours).length > 0;
  return (
    <>
      {(Object.keys(COLOUR_GROUPS) as ColourGroup[]).map((g) => {
        const def = COLOUR_GROUPS[g];
        const set = colours[g];
        const current = set ?? def.fallback;
        return (
          <div className="colour-row" key={g}>
            <div className="colour-name">
              <strong>{def.label}</strong>
              <span className="small muted">{def.hint}</span>
            </div>
            <div className="colour-controls">
              {def.presets.map(([hex, name]) => (
                <button
                  key={hex}
                  type="button"
                  className="colour-swatch"
                  aria-pressed={current === hex}
                  aria-label={`${def.label}: ${name}`}
                  title={name}
                  style={{ background: hex }}
                  onClick={() => onSet({ ...colours, [g]: hex })}
                />
              ))}
              <CustomColour
                key={current}
                label={`${def.label}, any colour`}
                value={current}
                onPreview={(hex) => onPreview({ ...colours, [g]: hex })}
                onCommit={(hex) => onSet({ ...colours, [g]: hex })}
              />
              {set && (
                <button
                  type="button"
                  className="wbtn ghost small"
                  onClick={() => {
                    const next = { ...colours };
                    delete next[g];
                    onSet(next);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        );
      })}
      {anySet && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" className="wbtn ghost small" onClick={() => onSet({})}>
            Reset all colours
          </button>
        </div>
      )}
    </>
  );
}
