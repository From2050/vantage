import { getProvider, type JSONSchema } from './provider';
import type { EntryType } from '@/types';

export interface StructuredEntry {
  title: string;
  type: EntryType;
  organization: string;
  dateFrom: string;
  dateTo: string;
  refinedNarrative: string;
  keyHighlights: string[];
  tags: string[];
  questions: string[];
}

const SYSTEM = `You turn a person's raw, messy notes about ONE experience into a structured entry for their career evidence library. You extract metadata AND write a coherent narrative.

ABSOLUTE CONSTRAINTS — never violate:
- The user is the sole authority on what they did. Never upgrade role, ownership, or impact.
- Preserve verb strength EXACTLY: "helped / supported / contributed to / assisted with" stays — never promote to "led / owned / drove / spearheaded / managed / headed".
- Never invent outcomes, metrics, numbers, team sizes, tools, dates, organizations, or achievements not in the notes.
- Do not imply sole ownership of shared work.

EXTRACTION RULES (only from what the notes actually say — never guess or fabricate):
- title: a concise, specific title (role, degree, or project name). If unclear, use a short descriptive label.
- type: classify as one of work | education | project | activity.
- organization: the company, school, team, or group name. If none is stated, "".
- dateFrom / dateTo: extract ONLY if mentioned. Format "YYYY" or "YYYY-MM". Use "present" for dateTo if the work is ongoing. If a date is not stated, leave it "" (dates are optional — never invent them).
- refinedNarrative: one detailed first-person paragraph in the SAME LANGUAGE as the raw notes, elaborating only on what the notes contain.
- keyHighlights: 3–5 concrete highlights grounded in the notes (fewer if the notes are thin).
- tags: 3–6 short skill/topic tags.
- questions: 1–3 clarifying questions ONLY if important facts are missing; otherwise an empty array.`;

const SCHEMA: JSONSchema = {
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
    questions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title',
    'type',
    'organization',
    'dateFrom',
    'dateTo',
    'refinedNarrative',
    'keyHighlights',
    'tags',
    'questions',
  ],
  propertyOrdering: [
    'title',
    'type',
    'organization',
    'dateFrom',
    'dateTo',
    'refinedNarrative',
    'keyHighlights',
    'tags',
    'questions',
  ],
};

const TYPES: EntryType[] = ['work', 'education', 'project', 'activity'];

export async function structureEntry(input: {
  rawNotes: string;
  currentTitle?: string;
  currentType?: EntryType;
}): Promise<StructuredEntry> {
  const hints: string[] = [];
  if (input.currentTitle?.trim()) hints.push(`Existing title (may refine): ${input.currentTitle}`);
  if (input.currentType) hints.push(`Existing type hint: ${input.currentType}`);
  const userMsg = `${hints.length ? hints.join('\n') + '\n\n' : ''}RAW NOTES:\n${input.rawNotes}`;

  const p = (await getProvider().generateJSON({
    system: SYSTEM,
    prompt: userMsg,
    schema: SCHEMA,
    maxTokens: 1800,
    temperature: 0.3,
  })) as Partial<StructuredEntry>;

  return {
    title: typeof p.title === 'string' ? p.title : '',
    type: TYPES.includes(p.type as EntryType) ? (p.type as EntryType) : 'work',
    organization: typeof p.organization === 'string' ? p.organization : '',
    dateFrom: typeof p.dateFrom === 'string' ? p.dateFrom : '',
    dateTo: typeof p.dateTo === 'string' ? p.dateTo : '',
    refinedNarrative: typeof p.refinedNarrative === 'string' ? p.refinedNarrative : '',
    keyHighlights: Array.isArray(p.keyHighlights) ? p.keyHighlights.filter((x) => typeof x === 'string') : [],
    tags: Array.isArray(p.tags) ? p.tags.filter((x) => typeof x === 'string') : [],
    questions: Array.isArray(p.questions) ? p.questions.filter((x) => typeof x === 'string') : [],
  };
}
