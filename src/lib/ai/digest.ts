import { getProvider, type JSONSchema } from './provider';
import type { JDDigest } from '@/types';

const SYSTEM = `Extract structured metadata from a job description. Your output must match the provided JSON schema.

Rules:
- Be conservative: include ONLY what is explicitly stated in the JD. Do not infer, extrapolate, or invent.
- keywords: technical skills, tools, technologies, and domain terms ONLY. Exclude soft skills (communication, teamwork, leadership-as-trait, etc.).
- requirements: must-have qualifications and core responsibilities. Signal words: "required", "must have", "minimum", "you have", "we require".
- niceToHave: preferred / bonus qualifications. Signal words: "preferred", "nice to have", "bonus", "a plus", "ideally".
- roleLevel: e.g. "junior", "mid-level", "senior", "lead", "staff" — only if stated or clearly implied by the title; otherwise "".
- context: company type or team context if stated; otherwise "".
- summary: 2–4 neutral sentences describing the role's purpose.`;

const SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    requirements: { type: 'array', items: { type: 'string' } },
    niceToHave: { type: 'array', items: { type: 'string' } },
    roleLevel: { type: 'string' },
    context: { type: 'string' },
  },
  required: ['summary', 'keywords', 'requirements', 'niceToHave', 'roleLevel', 'context'],
  propertyOrdering: ['summary', 'keywords', 'requirements', 'niceToHave', 'roleLevel', 'context'],
};

export async function generateDigest(rawJDText: string): Promise<JDDigest> {
  const parsed = (await getProvider().generateJSON({
    system: SYSTEM,
    prompt: rawJDText,
    schema: SCHEMA,
    maxTokens: 2000,
    temperature: 0,
  })) as Partial<JDDigest>;

  return {
    summary: parsed.summary ?? '',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    niceToHave: Array.isArray(parsed.niceToHave) ? parsed.niceToHave : [],
    roleLevel: parsed.roleLevel ?? '',
    context: parsed.context ?? '',
  };
}
