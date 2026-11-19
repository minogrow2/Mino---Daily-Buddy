"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { buildExtensions } from "./extensions";
import { uploadImage, signedUrls } from "@/lib/media";

const FONTS = [
  { label: "Outfit", value: "Outfit Variable, sans-serif" },
  { label: "Fredoka", value: "Fredoka Variable, sans-serif" },
  { label: "Nunito", value: "Nunito Variable, sans-serif" },
  { label: "Montserrat", value: "Montserrat Variable, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
];
const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px"];
const TEXT_COLORS = ["#3d2e2a", "#a9535f", "#c0392b", "#d9822b", "#b8860b", "#3f6b50", "#2a7f8e", "#3a5ba0", "#7a4fa3", "#857370"];
const HILITES = ["#fbefb8", "#fbd5db", "#cfe5d5", "#c9e4ee", "#e3d4f2", "#fde0c2"];

type Props = {
  content: JSONContent | string;
  onChange: (json: JSONContent, html: string) => void;
  variant?: "full" | "compact";
  placeholder?: string;
  onError?: (msg: string) => void;
};

export function RichEditor({ content, onChange, variant = "full", placeholder = "Start writing…", onError }: Props) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const editor = useEditor({
    extensions: buildExtensions(variant, placeholder),
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: variant === "compact" ? "compact" : "", "aria-label": "Document editor" } },
    onUpdate: ({ editor }) => cb.current(editor.getJSON(), editor.getHTML()),
  });
  if (!editor) return <div className="p-6 text-sm text-muted">Loading editor…</div>;
  return (
    <div>
      <Toolbar editor={editor} variant={variant} onError={onError} />
      <div className={variant === "full" ? "paper" : "rounded-xl border border-line bg-surface"}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Btn({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={`min-w-8 rounded-lg px-2 py-1 text-sm transition disabled:opacity-40 ${active ? "bg-pink font-semibold text-fg" : "text-fg hover:bg-surface-2"}`}
    >
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-5 w-px bg-line" aria-hidden />;

function Swatches({ label, icon, colors, onPick, onClear, current }: { label: string; icon: React.ReactNode; colors: string[]; onPick: (c: string) => void; onClear: () => void; current?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        className="flex min-w-8 flex-col items-center rounded-lg px-2 py-0.5 text-sm hover:bg-surface-2"
      >
        <span className="leading-tight">{icon}</span>
        <span className="h-1 w-5 rounded" style={{ background: current || "transparent", border: current ? undefined : "1px solid var(--line)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((c) => (
              <button key={c} type="button" aria-label={`${label} ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setOpen(false); }} className="h-6 w-6 rounded-full border border-line" style={{ background: c }} />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-1">
              Custom
              <input type="color" aria-label={`Custom ${label}`} className="h-6 w-8 cursor-pointer" onChange={(e) => onPick(e.target.value)} />
            </label>
            <button type="button" className="underline" onMouseDown={(e) => e.preventDefault()} onClick={() => { onClear(); setOpen(false); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor, variant, onError }: { editor: Editor; variant: "full" | "compact"; onError?: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const full = variant === "full";
  const ts = editor.getAttributes("textStyle");
  const c = () => editor.chain().focus();
  const heading = editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "0";

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const id = await uploadImage(f);
      const urls = await signedUrls([id]);
      c().setImage({ src: urls[id] ?? "", alt: f.name } as never).updateAttributes("image", { mediaId: id }).run();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Could not add the image.");
    } finally {
      setUploading(false);
    }
  }
  const imgSelected = editor.isActive("image");
  const inTable = editor.isActive("table");

  return (
    <div className="sticky top-0 z-20 mb-3 rounded-xl border border-line bg-surface p-1.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5">
        <Btn label="Undo" on={() => c().undo().run()} disabled={!editor.can().undo()}>↶</Btn>
        <Btn label="Redo" on={() => c().redo().run()} disabled={!editor.can().redo()}>↷</Btn>
        <Sep />
        <select aria-label="Text style" className="rounded-lg border border-line bg-surface px-1.5 py-1 text-sm" value={heading}
          onChange={(e) => { const v = e.target.value; if (v === "0") c().setParagraph().run(); else c().setHeading({ level: Number(v) as 1 | 2 | 3 }).run(); }}>
          <option value="0">Normal text</option>
          <option value="1">Heading</option>
          <option value="2">Subheading</option>
          <option value="3">Small heading</option>
        </select>
        <select aria-label="Font" className="rounded-lg border border-line bg-surface px-1.5 py-1 text-sm" value={ts.fontFamily ?? ""}
          onChange={(e) => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run())}>
          <option value="">Default font</option>
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <select aria-label="Font size" className="rounded-lg border border-line bg-surface px-1.5 py-1 text-sm" value={ts.fontSize ?? ""}
          onChange={(e) => c().setMark("textStyle", { fontSize: e.target.value || null }).run()}>
          <option value="">Size</option>
          {SIZES.map((s) => <option key={s} value={s}>{parseInt(s)}</option>)}
        </select>
        <Sep />
        <Btn label="Bold" active={editor.isActive("bold")} on={() => c().toggleBold().run()}><b>B</b></Btn>
        <Btn label="Italic" active={editor.isActive("italic")} on={() => c().toggleItalic().run()}><i>I</i></Btn>
        <Btn label="Underline" active={editor.isActive("underline")} on={() => c().toggleUnderline().run()}><u>U</u></Btn>
        <Swatches label="Text color" icon={<span className="font-semibold">A</span>} colors={TEXT_COLORS} current={ts.color}
          onPick={(col) => c().setColor(col).run()} onClear={() => c().unsetColor().run()} />
        <Swatches label="Highlight" icon={<span>🖍</span>} colors={HILITES} current={editor.getAttributes("highlight").color}
          onPick={(col) => c().toggleHighlight({ color: col }).run()} onClear={() => c().unsetHighlight().run()} />
        <Sep />
        <Btn label="Bulleted list" active={editor.isActive("bulletList")} on={() => c().toggleBulletList().run()}>• List</Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => c().toggleOrderedList().run()}>1. List</Btn>
        <Btn label="Checklist" active={editor.isActive("taskList")} on={() => c().toggleTaskList().run()}>☑ List</Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} on={() => c().toggleBlockquote().run()}>❝</Btn>
        <Btn label="Divider" on={() => c().setHorizontalRule().run()}>―</Btn>
        <Sep />
        <Btn label="Align left" active={editor.isActive({ textAlign: "left" })} on={() => c().setTextAlign("left").run()}>⇤</Btn>
        <Btn label="Align center" active={editor.isActive({ textAlign: "center" })} on={() => c().setTextAlign("center").run()}>↔</Btn>
        <Btn label="Align right" active={editor.isActive({ textAlign: "right" })} on={() => c().setTextAlign("right").run()}>⇥</Btn>
        {full && (
          <>
            <Sep />
            <Btn label="Insert table" on={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦ Table</Btn>
            <Btn label="Insert image or screenshot" on={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "🖼 Image"}</Btn>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files)} />
          </>
        )}
      </div>
      {full && inTable && (
        <div className="mt-1 flex flex-wrap items-center gap-0.5 border-t border-line pt-1 text-xs">
          <span className="mr-1 text-muted">Table:</span>
          <Btn label="Add row below" on={() => c().addRowAfter().run()}>+ Row</Btn>
          <Btn label="Add column right" on={() => c().addColumnAfter().run()}>+ Column</Btn>
          <Btn label="Delete row" on={() => c().deleteRow().run()}>− Row</Btn>
          <Btn label="Delete column" on={() => c().deleteColumn().run()}>− Column</Btn>
          <Btn label="Delete table" on={() => c().deleteTable().run()}>Delete table</Btn>
        </div>
      )}
      {full && imgSelected && (
        <div className="mt-1 flex flex-wrap items-center gap-0.5 border-t border-line pt-1 text-xs">
          <span className="mr-1 text-muted">Image:</span>
          {["25%", "50%", "75%", "100%"].map((w) => (
            <Btn key={w} label={`Resize image to ${w}`} active={editor.getAttributes("image").width === w} on={() => c().updateAttributes("image", { width: w }).run()}>{w}</Btn>
          ))}
          <Btn label="Delete image" on={() => c().deleteSelection().run()}>🗑 Delete</Btn>
        </div>
      )}
    </div>
  );
}
