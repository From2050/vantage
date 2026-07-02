import { getProvider, type JSONSchema } from './provider';
import type { Entry, EvidenceWeight, SkillCategory } from '@/types';
import { SKILL_CATEGORIES } from '@/types';

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
  evidence: { entryId: string; weight: EvidenceWeight }[];
}

const SYSTEM = `You extract a person's SKILL PORTFOLIO from their experience entries. Skills are the durable assets; entries are the evidence.

Rules:
- Extract ONLY skills genuinely evidenced by entry content. Never invent or embellish.
- Each skill lists evidence links: { entryId, weight } using only entryIds given in the input.
- weight rates how central the skill is to THAT entry:
  - 3 (core): the skill IS the main work of the entry — remove it and the entry loses its point.
  - 2 (supporting): substantial, repeated use, but not the entry's center.
  - 1 (mentioned): appears or was touched lightly.
  Rate honestly — most links are NOT 3.
- Granularity: skills a peer in the field would recognize as one competence. Not too broad ("engineering"), not too narrow ("wrote one Python script"). Aim for 8–25 skills total depending on the evidence.
- Merge near-duplicates into one canonical name (e.g. "DDR calibration" + "DDR3 tuning" → "DDR calibration"). Prefer the field's standard term, capitalized normally.
- If EXISTING SKILLS are provided, reuse their exact names when the same competence appears — do not create renamed duplicates.
- category, one of:
  - "technical": engineering/analytical competences (e.g. FPGA design, hardware validation, signal processing)
  - "tool": concrete tools, languages, platforms (e.g. Python, Synopsys HAPS, Grafana)
  - "domain": field/industry knowledge (e.g. camera systems, physiological monitoring)
  - "soft": transferable human skills (e.g. public speaking, coaching) — only when clearly evidenced`;

const SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: SKILL_CATEGORIES },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entryId: { type: 'string' },
                weight: { type: 'integer' },
              },
              required: ['entryId', 'weight'],
              propertyOrdering: ['entryId', 'weight'],
            },
          },
        },
        required: ['name', 'category', 'evidence'],
        propertyOrdering: ['name', 'category', 'evidence'],
      },
    },
  },
  required: ['skills'],
};

export async function extractSkills(
  entries: Entry[],
  existing: { name: string; category: SkillCategory }[],
): Promise<ExtractedSkill[]> {
  const compact = entries.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    organization: e.organization,
    tags: e.tags,
    keyHighlights: e.keyHighlights,
    narrative: (e.refinedNarrative || e.rawNotes).slice(0, 400),
  }));

  const userMsg = `${
    existing.length
      ? `EXISTING SKILLS (reuse these exact names when the same competence appears):\n${existing
          .map((s) => `- ${s.name} (${s.category})`)
          .join('\n')}\n\n`
      : ''
  }EXPERIENCE ENTRIES:\n${JSON.stringify(compact, null, 2)}`;

  const parsed = (await getProvider().generateJSON({
    system: SYSTEM,
    prompt: userMsg,
    schema: SCHEMA,
    maxTokens: 6000,
    temperature: 0.2,
  })) as { skills?: unknown[] };

  const validIds = new Set(entries.map((e) => e.id));
  const raw = Array.isArray(parsed.skills) ? parsed.skills : [];
  const out: ExtractedSkill[] = [];
  const seen = new Set<string>();

  for (const s of raw) {
    const o = (s ?? {}) as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name || seen.has(name.toLowerCase())) continue;

    const evidence: ExtractedSkill['evidence'] = [];
    const seenEntries = new Set<string>();
    if (Array.isArray(o.evidence)) {
      for (const ev of o.evidence) {
        const e = (ev ?? {}) as Record<string, unknown>;
        const entryId = typeof e.entryId === 'string' ? e.entryId : '';
        if (!entryId || !validIds.has(entryId) || seenEntries.has(entryId)) continue;
        seenEntries.add(entryId);
        const w = Number(e.weight);
        const weight = (w >= 1 && w <= 3 ? Math.round(w) : 2) as EvidenceWeight;
        evidence.push({ entryId, weight });
      }
    }
    if (evidence.length === 0) continue; // a skill with no evidence is not a skill here

    seen.add(name.toLowerCase());
    out.push({
      name,
      category: SKILL_CATEGORIES.includes(o.category as SkillCategory)
        ? (o.category as SkillCategory)
        : 'technical',
      evidence,
    });
  }
  return out;
}
