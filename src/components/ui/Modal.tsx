"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A native dialog with the legacy frosted look: Escape and a tap outside close it. */
export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="form-dialog"
      aria-label={title}
      style={wide ? { width: "min(560px, calc(100vw - 32px))", maxHeight: "88vh", overflow: "auto" } : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dlg">
        <div className="card-head" style={{ marginBottom: 4 }}>
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 style={{ marginTop: eyebrow ? 4 : 0 }}>{title}</h2>
          </div>
          <button type="button" className="wbtn ghost small" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Confirmation for destructive actions: `const { ask, dialog } = useConfirm(); if (await ask("…")) …` */
export function useConfirm() {
  const [state, setState] = useState<{ msg: string; resolve: (v: boolean) => void; label: string } | null>(null);
  const ask = (msg: string, label = "Delete") => new Promise<boolean>((resolve) => setState({ msg, resolve, label }));
  const done = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = state && (
    <Modal title="Are you sure?" onClose={() => done(false)}>
      <p>{state.msg}</p>
      <div className="actions">
        <button type="button" className="wbtn ghost small" onClick={() => done(false)}>
          Cancel
        </button>
        <button type="button" className={/Delete|Remove/.test(state.label) ? "wbtn danger small" : "wbtn primary small"} onClick={() => done(true)}>
          {state.label}
        </button>
      </div>
    </Modal>
  );
  return { ask, dialog };
}

export function ErrorNote({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="err">
      {error}
    </p>
  ) : null;
}
