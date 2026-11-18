import type { ReactNode } from "react";

/** A frosted section with an eyebrow, a title and optional controls on the right. */
export function Card({
  title,
  eyebrow,
  right,
  id,
  className = "",
  children,
}: {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`glass scroll-mt-6 p-5 ${className}`}>
      {(title || eyebrow || right) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-xs uppercase tracking-wide text-muted">{eyebrow}</p>}
            {title && <h2 className="font-display text-2xl">{title}</h2>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
