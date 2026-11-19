/* Inline SVG charts drawn to one scale in the Willow colours. Ported from the legacy svgBars, svgLine and legendHTML. */

const W = 640;
const L = 34; // left gutter for the scale values
const B = 24; // bottom gutter for the day labels
const T = 8; // top gutter

type Series = { name: string; values: number[]; color: string };

/** Labels show every few days at most, so a 90-day range stays legible. */
const labelStep = (n: number) => Math.ceil(n / 8);

/** Bars for one or more series. Colours go in style so the theme variables resolve in every browser. */
export function BarChart({
  series,
  labels,
  label = "Bar chart",
  h = 180,
}: {
  series: Series[];
  labels: string[];
  label?: string;
  h?: number;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = labels.length || 1;
  const gw = (W - L) / n;
  const bw = (gw * 0.72) / series.length;
  const step = labelStep(n);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => {
        const y = T + (h - B - T) * (1 - f);
        return (
          <g key={f}>
            <line className="grid-line" x1={L} x2={W} y1={y} y2={y} />
            <text x={L - 6} y={y + 4} textAnchor="end">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      {series.map((s, si) =>
        s.values.map((v, i) => {
          const bh = ((v || 0) / max) * (h - B - T);
          const x = L + i * gw + gw * 0.14 + si * bw;
          return (
            <rect
              key={`${si}-${i}`}
              x={x}
              y={h - B - bh}
              width={Math.max(1, bw - 1)}
              height={bh}
              rx={3}
              style={{ fill: s.color }}
            >
              <title>{`${labels[i]}: ${v || 0}`}</title>
            </rect>
          );
        }),
      )}
      {labels.map((lab, i) =>
        i % step === 0 ? (
          <text key={i} x={L + i * gw + gw / 2} y={h - 6} textAnchor="middle">
            {lab}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** A line of percentages from 0 to 100. */
export function LineChart({
  values,
  labels,
  label = "Line chart",
  h = 180,
}: {
  values: number[];
  labels: string[];
  label?: string;
  h?: number;
}) {
  const n = values.length;
  const x = (i: number) => L + (n <= 1 ? (W - L) / 2 : (i / (n - 1)) * (W - L - 8));
  const y = (v: number) => T + (h - B - T) * (1 - Math.min(100, Math.max(0, v || 0)) / 100);
  const step = labelStep(n);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line className="grid-line" x1={L} x2={W} y1={y(v)} y2={y(v)} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">
            {v}%
          </text>
        </g>
      ))}
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        style={{ stroke: "var(--rose)" }}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3} style={{ fill: "var(--rose)" }}>
          <title>{`${labels[i]}: ${v}%`}</title>
        </circle>
      ))}
      {labels.map((lab, i) =>
        i % step === 0 ? (
          <text key={i} x={x(i)} y={h - 6} textAnchor="middle">
            {lab}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** The key under a chart: a colour square and a name for each series. */
export function Legend({ items }: { items: [color: string, label: string][] }) {
  return (
    <div className="row-inline ana-legend">
      {items.map(([color, name]) => (
        <span key={name} className="legend">
          <i style={{ background: color }} />
          {name}
        </span>
      ))}
    </div>
  );
}
