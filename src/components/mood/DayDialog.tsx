"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The frosted day page dialog. Escape and a tap outside close it, as in the legacy app. */
export function DayDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
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
      className="form-dialog scrap-dialog"
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dlg scrap-day">{children}</div>
    </dialog>
  );
}
