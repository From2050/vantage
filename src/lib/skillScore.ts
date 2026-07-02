// Skill strength scoring — pure functions shared by server and client.
//
// Score model (0–100): the sum of evidence weights is the body of the score
// (each weight point ≈ 12 pts, saturating), scaled by how recent the latest
// evidence is, plus a small bonus for sustained use over years. Resolution is
// deliberately higher than "number of entries": one core role (w3) outranks
// two passing mentions (w1+w1), and stale skills decay.

import type { Entry, Skill } from '@/types';

const POINTS_PER_WEIGHT = 12;

export interface SkillStrength {
  score: number; // 0–100
  level: 1 | 2 | 3 | 4 | 5;
  weightSum: number;
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
  let weightSum = 0;
  let latest: number | null = null;
  let earliest: number | null = null;

  for (const ev of skill.evidence) {
    const entry = byId.get(ev.entryId);
    if (!entry) continue;
    weightSum += ev.weight;
    const from = dateToMs(entry.dateFrom, now);
    const to = dateToMs(entry.dateTo, now) ?? from;
    if (to !== null && (latest === null || to > latest)) latest = to;
    if (from !== null && (earliest === null || from < earliest)) earliest = from;
  }

  const recencyFactor = recencyFactorOf(latest, now);
  const spanYears =
    latest !== null && earliest !== null
      ? Math.max(0, (latest - earliest) / (365.25 * 24 * 3600 * 1000))
      : 0;
  // Sustained use bonus: +2 pts per year of evidence span, capped at +10.
  const spanBonus = Math.min(10, spanYears * 2);

  const raw = weightSum * POINTS_PER_WEIGHT * recencyFactor + spanBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, level: levelOf(score), weightSum, recencyFactor, spanYears };
}

export function levelOf(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 70) return 5;
  if (score >= 45) return 4;
  if (score >= 25) return 3;
  if (score >= 10) return 2;
  return 1;
}

export const WEIGHT_LABEL: Record<number, string> = {
  3: 'core',
  2: 'supporting',
  1: 'mentioned',
};
