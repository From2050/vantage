// Pure-SVG radar chart — server-renderable, no dependencies.
// Axes are generic { label, value 0–1, hint } so callers decide the semantics.

export interface RadarAxis {
  label: string;
  value: number; // 0–1
  hint?: string; // native tooltip
}

export default function RadarChart({ axes, size = 300 }: { axes: RadarAxis[]; size?: number }) {
  const n = axes.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44; // leave room for labels

  const point = (i: number, v: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * r * v, cy + Math.sin(angle) * r * v];
  };

  const ringPath = (v: number) =>
    axes.map((_, i) => point(i, v).join(',')).join(' ');

  const dataPath = axes.map((a, i) => point(i, Math.max(0.04, Math.min(1, a.value))).join(',')).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={`Skill radar: ${axes.map((a) => `${a.label} ${Math.round(a.value * 100)}%`).join(', ')}`}
    >
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon
          key={v}
          points={ringPath(v)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={v === 1 ? 0.18 : 0.08}
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
        );
      })}
      {/* data */}
      <polygon points={dataPath} fill="var(--accent)" fillOpacity={0.18} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = point(i, Math.max(0.04, Math.min(1, a.value)));
        return (
          <circle key={i} cx={x} cy={y} r={3.5} fill="var(--accent)">
            <title>{a.hint ?? `${a.label}: ${Math.round(a.value * 100)}`}</title>
          </circle>
        );
      })}
      {/* labels */}
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.22);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        const label = a.label.length > 16 ? a.label.slice(0, 15) + '…' : a.label;
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="central"
            className="fill-current"
            fontSize={11}
            opacity={0.65}
          >
            <title>{a.hint ?? a.label}</title>
            {label}
          </text>
        );
      })}
    </svg>
  );
}
