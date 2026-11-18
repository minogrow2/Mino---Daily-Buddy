"use client";

import { useMemo, useState } from "react";
import { uploadImage } from "@/lib/media";
import { coerce, customId, csvCell, isComputed, money, numText, pctText, readValue, RESULTS, type ColumnDef } from "@/lib/trading/columns";
import { ColumnSettings } from "./ColumnSettings";
import { ErrorNote } from "@/components/ui/Modal";

export type FlexRow = { id: string; created_at: string; screenshot_id?: string | null } & Record<string, unknown>;

type Props = {
  scope: "backtest" | "live";
  columns: ColumnDef[];
  rows: FlexRow[];
  urls: Record<string, string>;
  /** Balance-based % change per row id, computed by the parent. */
  pctById: Record<string, number | null>;
  currency: string;
  onColumnsChange: (cols: ColumnDef[]) => Promise<void> | void;
  onCreate: () => Promise<void>;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  onOpenScreenshot?: (url: string) => void;
  csvName: string;
};

type Drag = { id: string; startX: number; startW: number; w: number };
const MIN_WIDTH = 80;

export function FlexTable(p: Props) {
  const visible = p.columns.filter((c) => c.visible);
  const [q, setQ] = useState("");
  const [result, setResult] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);

  // While a column edge is being dragged, that column shows its live width.
  const wOf = (c: ColumnDef) => (drag?.id === c.id ? drag.w : c.width);

  const textCols = useMemo(() => p.columns.filter((c) => c.type === "text" || c.type === "long"), [p.columns]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = p.rows.filter((r) => !result || r.result === result);
    if (needle) list = list.filter((r) => textCols.some((c) => String(readValue(r, c) ?? "").toLowerCase().includes(needle)));
    if (sort) {
      const col = p.columns.find((c) => c.id === sort.key);
      if (col) {
        const get = (r: FlexRow) => (col.id === "pct" ? p.pctById[r.id] ?? null : isComputed(col) ? r.created_at : readValue(r, col));
        list = [...list].sort((a, b) => {
          const x = get(a) as string | number | null;
          const y = get(b) as string | number | null;
          if (x === y) return 0;
          if (x === null || x === "") return 1;
          if (y === null || y === "") return -1;
          return (x < y ? -1 : 1) * sort.dir;
        });
      }
    }
    return list;
  }, [p.rows, p.columns, p.pctById, q, result, sort, textCols]);

  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.id));
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Saves the new width once the pointer is released, not on every pixel.
  function endDrag() {
    if (!drag) return;
    const { id, startW, w } = drag;
    setDrag(null);
    if (w !== startW) run(async () => { await p.onColumnsChange(p.columns.map((c) => (c.id === id ? { ...c, width: w } : c))); });
  }

  function exportCsv() {
    const head = visible.map((c) => csvCell(c.label)).join(",");
    const body = shown.map((r) =>
      visible.map((c) => csvCell(c.id === "pct" ? p.pctById[r.id] ?? "" : c.type === "image" ? (r.screenshot_id ? p.urls[r.screenshot_id as string] ?? "" : "") : isComputed(c) ? r.created_at : readValue(r, c))).join(","),
    );
    const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.csvName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function displayValue(r: FlexRow, c: ColumnDef): string {
    if (c.id === "no") return String(p.rows.indexOf(r) + 1);
    if (c.id === "created") return new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (c.id === "pct") return pctText(p.pctById[r.id]);
    const v = readValue(r, c);
    if (c.key === "pl" || c.key === "fee") return money(Number(v), p.currency);
    if (c.type === "number") return numText(v === "" ? null : Number(v));
    return String(v ?? "");
  }

  return (
    <div className="glass overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <input className="input max-w-56" type="search" placeholder="Search trades…" aria-label="Search trades" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" aria-label="Filter by result" value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">All results</option>
          {RESULTS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="btn btn-sage btn-sm" disabled={busy} onClick={() => run(p.onCreate)}>+ Add row</button>
        <button className="btn btn-sm btn-danger" disabled={busy || picked.size === 0} onClick={() => run(async () => { await p.onDelete([...picked]); setPicked(new Set()); })}>
          Delete selected{picked.size ? ` (${picked.size})` : ""}
        </button>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-sm" onClick={exportCsv} disabled={shown.length === 0}>Export CSV</button>
          <button className="btn btn-sm" onClick={() => setSettings(true)}>Columns</button>
        </div>
      </div>
      <div className="px-3 pt-3"><ErrorNote error={error} /></div>
      {p.rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted">No rows yet. Press “+ Add row” to record your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-xs text-muted">
                <th className="w-10 px-2 py-2"><input type="checkbox" aria-label="Select all shown rows" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.id)))} /></th>
                {visible.map((c) => (
                  <th key={c.id} className="relative px-2 py-2 font-medium" style={{ width: wOf(c), minWidth: wOf(c) }}>
                    <button className="flex items-center gap-1 hover:text-fg" onClick={() => setSort((s) => (s?.key === c.id ? (s.dir === 1 ? { key: c.id, dir: -1 } : null) : { key: c.id, dir: 1 }))}>
                      {c.label}{sort?.key === c.id ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                    </button>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${c.label} column`}
                      title="Drag to resize"
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none hover:bg-[var(--sage)]/30"
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({ id: c.id, startX: e.clientX, startW: c.width, w: c.width });
                      }}
                      onPointerMove={(e) => {
                        if (drag?.id === c.id) setDrag({ ...drag, w: Math.max(MIN_WIDTH, drag.startW + e.clientX - drag.startX) });
                      }}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-line align-top hover:bg-surface-2/60">
                  <td className="px-2 py-1.5"><input type="checkbox" aria-label="Select row" checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  {visible.map((c) => (
                    <td key={c.id} className="px-2 py-1.5" style={{ width: wOf(c), minWidth: wOf(c) }}>
                      <Cell row={r} col={c} display={displayValue(r, c)} selectOptions={c.options} urls={p.urls} onPatch={(patch) => run(() => p.onPatch(r.id, patch))} onOpen={p.onOpenScreenshot} onUpload={(file) => run(async () => { const id = await uploadImage(file); await p.onPatch(r.id, { screenshot_id: id }); })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {settings && (
        <ColumnSettings scope={p.scope} columns={p.columns} onSave={async (cols) => { await p.onColumnsChange(cols); setSettings(false); }} onClose={() => setSettings(false)} />
      )}
    </div>
  );
}

function Cell({
  row, col, display, selectOptions, urls, onPatch, onOpen, onUpload,
}: {
  row: FlexRow; col: ColumnDef; display: string; selectOptions?: string[]; urls: Record<string, string>;
  onPatch: (patch: Record<string, unknown>) => void; onOpen?: (url: string) => void; onUpload: (f: File) => void;
}) {
  const raw = readValue(row, col);
  const cls = "w-full rounded-lg bg-transparent px-1.5 py-1 outline-none focus:bg-surface focus:ring-2 focus:ring-[var(--sage)]";
  const patchCol = (v: unknown) => onPatch(patchFor(row, col, coerce(col, v)));

  if (col.id === "no" || col.id === "created" || col.id === "pct" || isComputed(col)) return <span className="px-1.5 text-muted">{display}</span>;

  if (col.type === "image") {
    const id = row.screenshot_id as string | null | undefined;
    const url = id ? urls[id] : undefined;
    return (
      <div className="flex items-center gap-2">
        {url ? (
          <button type="button" aria-label="Open screenshot" onClick={() => (onOpen ? onOpen(url) : window.open(url, "_blank", "noopener"))} className="block h-12 w-16 overflow-hidden rounded-md border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Trade screenshot" className="h-full w-full object-cover" />
          </button>
        ) : <span className="text-xs text-muted">No image</span>}
        <label className="btn btn-sm cursor-pointer">
          {url ? "Replace" : "Upload"}
          <input type="file" accept="image/*" className="sr-only" aria-label="Upload screenshot for row" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(f); }} />
        </label>
      </div>
    );
  }
  if (col.type === "select") {
    return (
      <select className={cls} aria-label={col.label} value={String(raw ?? "")} onChange={(e) => patchCol(e.target.value)}>
        <option value="">—</option>
        {(selectOptions ?? []).map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === "date") {
    return <input type="date" className={cls} aria-label={col.label} value={String(raw ?? "")} onChange={(e) => patchCol(e.target.value)} />;
  }
  if (col.type === "number") {
    return (
      <input key={`${row.id}-${String(raw)}`} type="number" step="any" className={`${cls} text-right`} aria-label={col.label} defaultValue={raw === null || raw === "" ? "" : String(raw)}
        onBlur={(e) => { const v = e.target.value; if (String(raw ?? "") !== v) patchCol(v === "" ? null : v); }} />
    );
  }
  if (col.type === "long") {
    return (
      <textarea key={`${row.id}-${col.id}`} rows={2} className={`${cls} min-w-72 resize-y`} aria-label={col.label} defaultValue={String(raw ?? "")}
        onBlur={(e) => { if (String(raw ?? "") !== e.target.value) patchCol(e.target.value); }} />
    );
  }
  return (
    <input key={`${row.id}-${col.id}-${String(raw)}`} className={cls} aria-label={col.label} defaultValue={String(raw ?? "")} maxLength={col.key === "market" ? 40 : 200}
      onBlur={(e) => { if (String(raw ?? "") !== e.target.value) patchCol(e.target.value); }} />
  );
}

function patchFor(row: FlexRow, col: ColumnDef, v: unknown): Record<string, unknown> {
  const x = customId(col);
  if (x) return { extra: { ...((row.extra as Record<string, unknown>) ?? {}), [x]: v } };
  return { [col.key]: v };
}
