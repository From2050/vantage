import { db, schema } from '@/lib/db';
import type { EvidenceWeight, Skill, SkillCategory, SkillEvidence } from '@/types';

// All skills with their weighted evidence links, strongest-evidenced first.
export function listSkills(): Skill[] {
  const rows = db.select().from(schema.skills).all();
  const links = db.select().from(schema.entrySkills).all();
  const bySkill = new Map<string, SkillEvidence[]>();
  for (const l of links) {
    let arr = bySkill.get(l.skillId);
    if (!arr) {
      arr = [];
      bySkill.set(l.skillId, arr);
    }
    const weight = (l.weight >= 1 && l.weight <= 3 ? l.weight : 2) as EvidenceWeight;
    arr.push({ entryId: l.entryId, weight });
  }
  const weightSum = (evidence: SkillEvidence[]) => evidence.reduce((a, e) => a + e.weight, 0);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as SkillCategory,
      evidence: (bySkill.get(r.id) ?? []).sort((a, b) => b.weight - a.weight),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => weightSum(b.evidence) - weightSum(a.evidence) || a.name.localeCompare(b.name));
}
