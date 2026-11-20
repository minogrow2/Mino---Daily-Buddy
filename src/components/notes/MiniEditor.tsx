"use client";

import dynamic from "next/dynamic";

/** The tiptap code loads after the page paints, so pages with a note box do not wait for the editor in their first load. */
export const MiniEditor = dynamic(() => import("./MiniEditorBody").then((m) => m.MiniEditorBody), {
  ssr: false,
  loading: () => (
    <div className="rt-wrap" style={{ minHeight: 120 }} aria-busy="true">
      <p className="small muted" style={{ padding: 12 }}>Loading the editor…</p>
    </div>
  ),
});
