import type { ReactNode } from "react";

/** A frosted, see-through card with an eyebrow, a title and optional controls on the right, as in the legacy app. */
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
    <section id={id} className={`card scroll-mt-6 ${className}`}>
      {(title || eyebrow || right) && (
        <div className="card-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2>{title}</h2>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
