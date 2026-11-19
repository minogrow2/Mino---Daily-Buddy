/** A thin line icon from the static icon set in lib/willow/constants (never user input). */
export function Icon({ body, className = "h-5 w-5" }: { body: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
