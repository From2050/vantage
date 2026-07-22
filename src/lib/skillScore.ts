// Skill strength scoring — pure functions shared by server and client.
//
// Model (0–100), depth-first and hard to saturate:
//   - `entry_skills.weight` is an OWNERSHIP-DEPTH ladder (1–4), not a count:
//       4 = led / architected a substantial system at scale
//       3 = owned the core of the work
//       2 = contributed substantially (shared/bounded ownership)
//       1 = used / exposed to it
//   - The single DEEPEST piece of evidence anchors the score (a "base"). Additional
//     evidence corroborates with STRONG diminishing returns, so you cannot reach the
//     top by piling up shallow mentions — past the mid-band, only genuine ownership
//     depth (weight 3–4) moves the needle.
//   - Then scaled by recency of the latest evidence, plus a small sustained-use bonus.
// The ceiling is deliberately hard: routine core work lands mid-to-high; only
// sustained, recent, led-at-scale ownership approaches 90–100.

import type { Entry, Skill } from '@/types';

// One piece of evidence at each depth anchors the score here (before corroboration).
const DEPTH_BASE: Record<number, number> = { 1: 12, 2: 26, 3: 46, 4: 64 };
// Corroborating (non-anchor) links add this much, before diminishing-returns decay.
const CORROBORATION_VALUE: Record<number, number> = { 1: 2, 2: 5, 3: 9, 4: 13 };
const CORROBORATION_DECAY = 0.55; // each further link counts ~55% of the previous
const CORROBORATION_CAP = 24;
const LONE_EVIDENCE_FACTOR = 0.9; // a single data point is slightly weaker

export interface SkillStrength {
  score: number; // 0–100
  level: 1 | 2 | 3 | 4 | 5;
  maxWeight: number; // deepest ownership evidenced (1–4)
  evidenceCount: number;
  recencyFactor: number;
  spanYears: number;
}

// "2023-09" | "2023" | "present" | "" → ms timestamp (month precision), or null.
function dateToMs(d: string, now: number): number | null {
  if (!d) return null;
  if (d === 'present') return now;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) - 1 : 6; // year-only → mid-year
  return new Date(year, month, 1).getTime();
}

function recencyFactorOf(latestMs: number | null, now: number): number {
  if (latestMs === null) return 0.9; // undated evidence: mild uncertainty discount
  const years = (now - latestMs) / (365.25 * 24 * 3600 * 1000);
  if (years <= 1) return 1.0;
  if (years <= 3) return 0.85;
  return 0.7;
}

export function strengthOf(skill: Skill, entries: Entry[], now = Date.now()): SkillStrength {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const weights: number[] = [];
  let latest: number | null = null;
  let earliest: number | null = null;

  for (const ev of skill.evidence) {
    const entry = byId.get(ev.entryId);
    if (!entry) continue;
    weights.push(ev.weight);
    const from = dateToMs(entry.dateFrom, now);
    const to = dateToMs(entry.dateTo, now) ?? from;
    if (to !== null && (latest === null || to > latest)) latest = to;
    if (from !== null && (earliest === null || from < earliest)) earliest = from;
  }

  if (weights.length === 0) {
    return { score: 0, level: 1, maxWeight: 0, evidenceCount: 0, recencyFactor: 0.9, spanYears: 0 };
  }

  // Deepest evidence anchors; the rest corroborate with diminishing returns.
  weights.sort((a, b) => b - a);
  const maxWeight = weights[0];
  let base = DEPTH_BASE[maxWeight] ?? DEPTH_BASE[2];
  if (weights.length === 1) base *= LONE_EVIDENCE_FACTOR;

  let extra = 0;
  for (let i = 1; i < weights.length; i++) {
    extra += (CORROBORATION_VALUE[weights[i]] ?? 2) * Math.pow(CORROBORATION_DECAY, i);
  }
  extra = Math.min(CORROBORATION_CAP, extra);

  const recencyFactor = recencyFactorOf(latest, now);
  const spanYears =
    latest !== null && earliest !== null
      ? Math.max(0, (latest - earliest) / (365.25 * 24 * 3600 * 1000))
      : 0;
  const spanBonus = Math.min(10, spanYears * 2); // +2/yr of evidence span, cap +10

  const raw = (base + extra) * recencyFactor + spanBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, level: levelOf(score), maxWeight, evidenceCount: weights.length, recencyFactor, spanYears };
}

export function levelOf(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 70) return 5;
  if (score >= 45) return 4;
  if (score >= 25) return 3;
  if (score >= 10) return 2;
  return 1;
}

// Ownership-depth ladder labels (weight 1–4).
export const WEIGHT_LABEL: Record<number, string> = {
  4: 'led',
  3: 'owned core',
  2: 'contributed',
  1: 'used',
};
