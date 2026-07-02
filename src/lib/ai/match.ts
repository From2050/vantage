import { getProvider, type JSONSchema } from './provider';
import type { CompactEntry, JDDigest, MatchResult } from '@/types';

const SYSTEM = `You match a candidate's experience entries against a job description digest, for résumé tailoring.

For each entry, assign a relevance score from 0 to 10 reflecting how well its actual evidence (title, type, organization, keyHighlights, tags) supports the JD's requirements and keywords. Give a short, concrete rationale. Optionally add a framingNote suggesting which aspect of that entry to emphasize for this specific role.

Also produce a "gaps" list: specific JD requirements that NO entry currently evidences.

Rules:
- Score honestly; never inflate. High scores require genuine overlap with the entry's real content.
- Include ALL entries with score >= 4 in "matches", sorted by score descending.
- rationale and framingNote must reference real overlap, not generic praise. If no framing is useful, return "" for framingNote.
- gaps must be concrete and tied to JD requirements the candidate cannot currently evidence.`;

const SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entryId: { type: 'string' },
          score: { type: 'number' },
          rationale: { type: 'string' },
          framingNote: { type: 'string' },
        },
        required: ['entryId', 'score', 'rationale', 'framingNote'],
        propertyOrdering: ['entryId', 'score', 'rationale', 'framingNote'],
      },
    },
    gaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['matches', 'gaps'],
  propertyOrdering: ['matches', 'gaps'],
};

export async function matchEntries(
  digest: JDDigest,
  entries: CompactEntry[],
): Promise<MatchResult> {
  const userMsg = `JOB DESCRIPTION DIGEST:
${JSON.stringify(digest, null, 2)}

CANDIDATE ENTRIES:
${JSON.stringify(entries, null, 2)}`;

  const parsed = (await getProvider().generateJSON({
    system: SYSTEM,
    prompt: userMsg,
    schema: SCHEMA,
    maxTokens: 3000,
    temperature: 0.2,
  })) as Partial<MatchResult>;

  const validIds = new Set(entries.map((e) => e.id));
  const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
    .filter((m) => m && typeof m.entryId === 'string' && validIds.has(m.entryId))
    .map((m) => ({
      entryId: m.entryId,
      score: Number(m.score) || 0,
      rationale: typeof m.rationale === 'string' ? m.rationale : '',
      framingNote: typeof m.framingNote === 'string' ? m.framingNote : '',
    }))
    .filter((m) => m.score >= 4)
    .sort((a, b) => b.score - a.score);

  const gaps = (Array.isArray(parsed.gaps) ? parsed.gaps : []).filter(
    (g): g is string => typeof g === 'string',
  );

  return { matches, gaps };
}
