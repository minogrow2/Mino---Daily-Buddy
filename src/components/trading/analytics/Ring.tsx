export function Ring({ value, label, sub, color = "#3f6b50", size = 132 }: { value: number | null; label: string; sub?: string; color?: string; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const shown = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value === null ? "no data yet" : `${value.toFixed(1)}%`}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sage-fill)" strokeWidth={10} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl leading-none">{value === null ? "—" : `${value.toFixed(1)}%`}</span>
        </div>
      </div>
      <p className="text-sm font-medium">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
