"use client";

import { useState, type FormEvent } from "react";
import { ErrorNote, Modal } from "@/components/ui/Modal";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "url" | "date" | "number" | "select" | "textarea";
  required?: boolean;
  max?: number;
  min?: number;
  placeholder?: string;
  hint?: string;
  options?: [string, string][];
  value?: string;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** A small form in the legacy dialog style. Values stay as text until the save reads them. */
export function FormModal({
  title,
  eyebrow,
  fields,
  submit,
  onSave,
  onClose,
}: {
  title: string;
  eyebrow?: string;
  fields: FormField[];
  submit: string;
  onSave: (v: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.value ?? f.options?.[0]?.[0] ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: FormEvent) {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.name]?.trim());
    if (missing) {
      setError(`Add ${missing.label.toLowerCase()} first.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (x) {
      setError(errorText(x));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} eyebrow={eyebrow} onClose={onClose}>
      <form onSubmit={go} style={{ display: "grid", gap: 12 }}>
        {fields.map((f) => (
          <label key={f.name} className="small muted" style={{ display: "grid", gap: 5 }}>
            <span>
              {f.label}
              {f.hint && <span> · {f.hint}</span>}
            </span>
            {f.type === "textarea" ? (
              <textarea
                className="winput"
                rows={2}
                value={values[f.name]}
                placeholder={f.placeholder}
                maxLength={f.max}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            ) : f.type === "select" ? (
              <select
                className="winput"
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              >
                {f.options?.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="winput"
                type={f.type ?? "text"}
                value={values[f.name]}
                placeholder={f.placeholder}
                maxLength={f.max}
                min={f.min}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            )}
          </label>
        ))}
        <ErrorNote error={error} />
        <div className="actions">
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="wbtn primary small" disabled={busy}>
            {busy ? "Saving…" : submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}
