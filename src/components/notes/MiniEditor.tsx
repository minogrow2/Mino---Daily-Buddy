"use client";

import type { ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * The small rich-text box for goal notes: the same toolbar as the legacy app (B, I, U, lists, quote),
 * reading and writing HTML. Read-only mode shows the note without the toolbar.
 */
export function MiniEditor({
  html,
  label,
  placeholder = "",
  readOnly = false,
  onChange,
}: {
  html: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder }),
    ],
    content: html,
    editable: !readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: readOnly ? "rt rt-view" : "rt",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "aria-readonly": String(readOnly),
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  if (readOnly) return <EditorContent editor={editor} />;

  const tool = (name: string, active: boolean, run: () => void, content: ReactNode) => (
    <button
      type="button"
      className="rt-btn"
      aria-label={name}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {content}
    </button>
  );

  return (
    <div className="rt-wrap">
      <div className="rt-bar" role="toolbar" aria-label="Text formatting">
        {tool("Bold", !!editor?.isActive("bold"), () => editor?.chain().focus().toggleBold().run(), <b>B</b>)}
        {tool("Italic", !!editor?.isActive("italic"), () => editor?.chain().focus().toggleItalic().run(), <i>I</i>)}
        {tool("Underline", !!editor?.isActive("underline"), () => editor?.chain().focus().toggleUnderline().run(), <u>U</u>)}
        {tool("Bulleted list", !!editor?.isActive("bulletList"), () => editor?.chain().focus().toggleBulletList().run(), "• List")}
        {tool("Numbered list", !!editor?.isActive("orderedList"), () => editor?.chain().focus().toggleOrderedList().run(), "1. List")}
        {tool("Quote", !!editor?.isActive("blockquote"), () => editor?.chain().focus().toggleBlockquote().run(), "“ Quote")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
