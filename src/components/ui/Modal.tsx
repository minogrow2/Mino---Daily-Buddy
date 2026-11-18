"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass flex max-h-[92vh] w-full flex-col outline-none ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="font-display text-xl">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/** Confirmation for destructive actions: `const { ask, dialog } = useConfirm(); if (await ask("…")) …` */
export function useConfirm() {
  const [state, setState] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null);
  const ask = (msg: string) => new Promise<boolean>((resolve) => setState({ msg, resolve }));
  const done = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = state && (
    <Modal title="Are you sure?" onClose={() => done(false)}>
      <p className="mb-5 text-sm">{state.msg}</p>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={() => done(false)}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={() => done(true)}>
          Delete
        </button>
      </div>
    </Modal>
  );
  return { ask, dialog };
}

export function ErrorNote({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="rounded-xl border border-rose/40 bg-pink-soft px-3 py-2 text-sm text-rose">
      {error}
    </p>
  ) : null;
}
