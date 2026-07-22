import { getProvider, type JSONSchema } from './provider';
import type { EntryType } from '@/types';
import type { StructuredEntry } from './structure';

const SYSTEM = `You split an existing résumé, CV, or career document into SEPARATE structured entries. The unit of an entry is a distinct ACCOMPLISHMENT — a project, a deliverable, a body of work with its own outcome — NOT a job title or a time span. A single job that contains several distinct bodies of work becomes SEVERAL entries (same organization, overlapping dates are fine); a degree or a standalone project/activity is its own entry too. Organization and dates are context on an accomplishment, not the boundary.

ABSOLUTE CONSTRAINTS — never violate:
- Use ONLY information present in the document. Never invent details, metrics, dates, organizations, or achievements.
- Preserve verb strength EXACTLY. Never upgrade "helped/supported/contributed to" to "led/owned/drove/managed/spearheaded".
- Do not imply sole ownership of shared work.

For EACH entry, extract:
- title: the accomplishment / project / degree name (what was done), not just a job title.
- type: work | education | project | activity.
- organization: company / school / team name, or "" if absent.
- dateFrom / dateTo: ONLY if present in the document ("YYYY" or "YYYY-MM"; "present" if ongoing). Leave "" if not stated — never invent.
- refinedNarrative: a coherent first-person paragraph in the SAME LANGUAGE as the document, built ONLY from that entry's content.
- keyHighlights: 2–5 concrete highlights from that entry.
- tags: 3–6 short skill/topic tags.
- questions: [] (leave empty here).

Return entries in order. Split granularly by ACCOMPLISHMENT: when one role clearly did several distinct bodies of work, emit one entry per body of work (repeat the organization/dates) rather than one lumped job entry. Never merge two different accomplishments into one entry.`;

const ENTRY_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    type: { type: 'string', enum: ['work', 'education', 'project', 'activity'] },
    organization: { type: 'string' },
    dateFrom: { type: 'string' },
    dateTo: { type: 'string' },
    refinedNarrative: { type: 'string' },
    keyHighlights: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'type', 'organization', 'dateFrom', 'dateTo', 'refinedNarrative', 'keyHighlights', 'tags'],
  propertyOrdering: ['title', 'type', 'organization', 'dateFrom', 'dateTo', 'refinedNarrative', 'keyHighlights', 'tags'],
};

const TYPES: EntryType[] = ['work', 'education', 'project', 'activity'];

export async function splitResume(text: string): Promise<StructuredEntry[]> {
  // Harness adaptation: basic-tier models get one document chunk at a time
  // instead of the whole résumé — smaller task, higher structured-output reliability.
  if (getProvider().capabilities.tier === 'basic' && text.length > 3500) {
    const chunks: string[] = [];
    let current = '';
    for (const block of text.split(/\n{2,}/)) {
      if (current.length + block.length > 3000 && current) {
        chunks.push(current);
        current = block;
      } else {
        current = current ? `${current}\n\n${block}` : block;
      }
    }
    if (current) chunks.push(current);
    const results: StructuredEntry[] = [];
    for (const chunk of chunks) {
      results.push(...(await splitChunk(chunk)));
    }
    // Dedup by title+org (a heading may straddle two chunks).
    const seen = new Set<string>();
    return results.filter((e) => {
      const key = `${e.title.toLowerCase()}|${e.organization.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return splitChunk(text);
}

async function splitChunk(text: string): Promise<StructuredEntry[]> {
  const parsed = (await getProvider().generateJSON({
    system: SYSTEM,
    prompt: `DOCUMENT:\n${text}`,
    schema: {
      type: 'object',
      properties: { entries: { type: 'array', items: ENTRY_SCHEMA } },
      required: ['entries'],
    },
    maxTokens: 8000,
    temperature: 0.2,
  })) as { entries?: unknown[] };

  const raw = Array.isArray(parsed.entries) ? parsed.entries : [];
  return raw.map((e): StructuredEntry => {
    const o = (e ?? {}) as Record<string, unknown>;
    return {
      title: typeof o.title === 'string' ? o.title : '',
      type: TYPES.includes(o.type as EntryType) ? (o.type as EntryType) : 'work',
      organization: typeof o.organization === 'string' ? o.organization : '',
      dateFrom: typeof o.dateFrom === 'string' ? o.dateFrom : '',
      dateTo: typeof o.dateTo === 'string' ? o.dateTo : '',
      refinedNarrative: typeof o.refinedNarrative === 'string' ? o.refinedNarrative : '',
      keyHighlights: Array.isArray(o.keyHighlights) ? o.keyHighlights.filter((x): x is string => typeof x === 'string') : [],
      tags: Array.isArray(o.tags) ? o.tags.filter((x): x is string => typeof x === 'string') : [],
      questions: [],
    };
  });
}
