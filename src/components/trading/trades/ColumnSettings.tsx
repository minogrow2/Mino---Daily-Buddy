"use client";

import { useState } from "react";
import { Modal, ErrorNote } from "@/components/ui/Modal";
import { defaultColumns, type ColumnDef, type ColumnType } from "@/lib/trading/columns";

const TYPES: { value: ColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "long", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
];

export function ColumnSettings({
  scope,
  columns,
  onSave,
  onClose,
}: {
  scope: "backtest" | "live";
  columns: ColumnDef[];
  onSave: (cols: ColumnDef[]) => Promise<void>;
  onClose: () => void;
}) {
  const [cols, setCols] = useState<ColumnDef[]>(() => columns.map((c) => ({ ...c, options: c.options ? [...c.options] : undefined })));
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<ColumnDef>) => setCols((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) =>
    setCols((cs) => {
      const j = i + d;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Changing a custom column's type keeps its values; dropdowns need at least one option.
  function changeType(i: number, next: ColumnType) {
    const current = cols[i];
    update(i, { type: next, options: next === "select" ? (current.options?.length ? current.options : ["Option 1"]) : undefined });
  }

  function addCustom() {
    const label = name.trim();
    if (!label) return setError("Give the new column a name.");
    if (cols.some((c) => c.label.toLowerCase() === label.toLowerCase())) return setError("A column with that name already exists.");
    const id = `c_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`;
    const opts = type === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    if (type === "select" && !opts?.length) return setError("Add at least one option, separated by commas.");
    setCols((cs) => [...cs, { id, label, type, key: `extra.${id}`, width: type === "long" ? 300 : 160, visible: true, builtin: false, options: opts }]);
    setName("");
    setOptions("");
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(cols.map((c) => ({ ...c, label: c.label.trim() || c.id })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the columns.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Table columns" onClose={onClose} wide>
      <div className="space-y-5">
        <p className="text-sm text-muted">Rename, hide, reorder, or change the type of columns. Built-in columns can be hidden but not removed. Custom columns can be removed at any time. Drag a column edge in the table to resize it.</p>
        <ul className="space-y-2">
          {cols.map((c, i) => (
            <li key={c.id} className="rounded-xl border border-line p-3" style={{ background: "var(--sage-fill)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={c.visible} onChange={(e) => update(i, { visible: e.target.checked })} className="accent-[var(--sage-deep)]" aria-label={`Show ${c.label}`} /> Show
                </label>
                <input className="input max-w-52" aria-label={`Name of column ${i + 1}`} value={c.label} maxLength={60} onChange={(e) => update(i, { label: e.target.value })} />
                {c.builtin ? (
                  <span className="tag">Built-in</span>
                ) : (
                  <select className="input w-auto" aria-label={`Type of ${c.label}`} value={c.type} onChange={(e) => changeType(i, e.target.value as ColumnType)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                )}
                <div className="ml-auto flex gap-1">
                  <button className="btn btn-sm" aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="btn btn-sm" aria-label={`Move ${c.label} down`} disabled={i === cols.length - 1} onClick={() => move(i, 1)}>↓</button>
                  {!c.builtin && <button className="btn btn-sm btn-danger" onClick={() => setCols((cs) => cs.filter((_, j) => j !== i))}>Remove</button>}
                </div>
              </div>
              {c.type === "select" && (
                <div className="mt-2">
                  <label className="label" htmlFor={`opts-${c.id}`}>Dropdown options (comma separated)</label>
                  <input id={`opts-${c.id}`} className="input" defaultValue={(c.options ?? []).join(", ")} onBlur={(e) => update(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-dashed border-line p-3">
          <p className="mb-2 font-display text-lg">Add a custom column</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
            <input className="input" placeholder="Column name, e.g. Spread" aria-label="New column name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <select className="input" aria-label="New column type" value={type} onChange={(e) => setType(e.target.value as ColumnType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {type === "select" && <input className="input mt-2" placeholder="Options, comma separated" aria-label="New column options" value={options} onChange={(e) => setOptions(e.target.value)} />}
          <button className="btn btn-sm mt-2" onClick={addCustom}>+ Add column</button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button className="btn btn-sm" onClick={() => setCols(defaultColumns(scope))} title="Restore the built-in columns and their order">Reset to defaults</button>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-sage" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save columns"}</button>
          </div>
        </div>
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}
