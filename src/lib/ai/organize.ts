import { getProvider } from './provider';
import type { EntryType } from '@/types';

const SYSTEM = `You help a job-seeker turn raw, messy notes about ONE experience into a detailed, coherent narrative for their personal evidence library.

ABSOLUTE CONSTRAINTS — never violate these, even slightly:
- The user is the sole authority on what they did. Never upgrade their role, ownership, or impact beyond what they stated.
- Preserve verb strength EXACTLY. If they wrote "helped", "supported", "contributed to", "assisted with", "was part of" — keep that strength. NEVER promote to "led", "owned", "drove", "spearheaded", "managed", "headed", "orchestrated", "championed", "delivered single-handedly", or any stronger ownership verb.
- Never invent outcomes, metrics, numbers, percentages, team sizes, dates, tools, or achievements that are not in the raw notes.
- Do not add language implying sole ownership of shared or team work.
- If important facts are missing (dates, the user's specific responsibility vs. the team's, the outcome), do NOT guess or fill them in. Instead append a short "Questions:" section with 1–3 clarifying questions.

Write in the first person, past tense (use present tense only for clearly ongoing work). Write in the SAME LANGUAGE as the raw notes. Be detailed and specific, but ELABORATE ONLY on what the notes actually contain — never fabricate to sound impressive.

OUTPUT FORMAT (follow exactly; no preamble, no headings other than these):
<one prose paragraph: the refined narrative>

Key highlights:
- <highlight grounded strictly in the notes>
- <highlight>
- <highlight>

Suggested tags: tag1, tag2, tag3

(If and only if key facts are missing, add after the tags:)
Questions:
- <clarifying question>`;

export function organizeStream(input: { rawNotes: string; type: EntryType; title: string }) {
  const userMsg = `Entry type: ${input.type}
Title: ${input.title || '(untitled)'}

Raw notes:
${input.rawNotes}`;

  return getProvider().generateStream({
    system: SYSTEM,
    prompt: userMsg,
    maxTokens: 1500,
    temperature: 0.3,
  });
}
