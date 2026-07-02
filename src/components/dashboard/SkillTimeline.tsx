// Pure-SVG horizontal timeline: active evidence span per top skill.
// Shows how the skill composition evolved over time. Server-renderable.

import type { Entry, Skill } from '@/types';
import { strengthOf } from '@/lib/skillScore';

function parseYearMonth(d: string, nowYear: number): number | null {
  if (!d) return null;
  if (d === 'present') return nowYear + 0.5;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d.trim());
  if (!m) return null;
  return Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0.5);
}

export default function SkillTimeline({
  skills,
  entries,
  maxRows = 8,
}: {
  skills: Skill[];
  entries: Entry[];
  maxRows?: number;
}) {
  const nowYear = new Date().getFullYear();
  const byId = new Map(entries.map((e) => [e.id, e]));

  const rows = skills
    .map((s) => {
      let from: number | null = null;
      let to: number | null = null;
      for (const ev of s.evidence) {
        const entry = byId.get(ev.entryId);
        if (!entry) continue;
        const f = parseYearMonth(entry.dateFrom, nowYear);
        const t = parseYearMonth(entry.dateTo, nowYear) ?? f;
        if (f !== null && (from === null || f < from)) from = f;
        if (t !== null && (to === null || t > to)) to = t;
      }
      return from !== null && to !== null
        ? { name: s.name, from, to: Math.max(to, from + 0.25), score: strengthOf(s, entries).score }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRows)
    .sort((a, b) => a.from - b.from);

  if (rows.length < 2) return null;

  const minYear = Math.floor(Math.min(...rows.map((r) => r.from)));
  const maxYear = Math.ceil(Math.max(...rows.map((r) => r.to), nowYear + 0.5));
  const span = maxYear - minYear || 1;

  const W = 720;
  const LABEL_W = 150;
  const ROW_H = 26;
  const AXIS_H = 24;
  const H = rows.length * ROW_H + AXIS_H;
  const x = (year: number) => LABEL_W + ((year - minYear) / span) * (W - LABEL_W - 12);

  const yearTicks: number[] = [];
  const step = span > 10 ? 2 : 1;
  for (let y = minYear; y <= maxYear; y += step) yearTicks.push(y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Skill activity timeline">
      {/* year grid */}
      {yearTicks.map((y) => (
        <g key={y}>
          <line x1={x(y)} y1={0} x2={x(y)} y2={H - AXIS_H + 6} stroke="currentColor" strokeOpacity={0.07} />
          <text x={x(y)} y={H - 6} textAnchor="middle" fontSize={10} className="fill-current" opacity={0.45}>
            {y}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = i * ROW_H + ROW_H / 2;
        const opacity = 0.35 + 0.65 * (r.score / 100);
        return (
          <g key={r.name}>
            <text x={LABEL_W - 10} y={y} textAnchor="end" dominantBaseline="central" fontSize={11} className="fill-current" opacity={0.7}>
              {r.name.length > 20 ? r.name.slice(0, 19) + '…' : r.name}
            </text>
            <rect
              x={x(r.from)}
              y={y - 5}
              width={Math.max(6, x(r.to) - x(r.from))}
              height={10}
              rx={5}
              fill="var(--accent)"
              opacity={opacity}
            >
              <title>{`${r.name}: ${Math.floor(r.from)}–${r.to >= nowYear ? 'present' : Math.floor(r.to)} · strength ${r.score}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}
