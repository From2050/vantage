import { getProvider } from './provider';
import type { Entry, GoalsDocument } from '@/types';

const SYSTEM = `You analyze a person's skill composition from their experience entries and goals, to help them see where they stand and where to head.

Produce these sections (concise markdown, skimmable):
## Skill clusters
Group their evidenced skills into 3–5 themes. For each, note roughly how deep the evidence is (which entries support it).
## Strengths
2–4 areas that are well-evidenced now, each tied to specific entries by title.
## Gaps & thin spots
Relative to their stated goals/direction (if given), what is missing or only lightly evidenced. Be honest, not flattering.
## Suggested directions
2–3 concrete directions or next moves to build toward their goals, distinguishing "well-evidenced now" from "needs development".

Rules:
- Ground everything in their ACTUAL entries; reference entry titles. Never invent skills or experience.
- If goals are absent, focus on what their evidence suggests and note that clearer goals would sharpen the analysis.
- LANGUAGE: write in the language the person wrote their GOALS & VALUES in; if goals are empty,
  match the dominant language of their entries. Keep technical terms in standard form.`;

export function buildSkillAnalysis(input: { entries: Entry[]; goals: GoalsDocument | null }) {
  const entryLines = input.entries
    .map((e) => {
      const tags = e.tags.length ? ` | tags: ${e.tags.join(', ')}` : '';
      const hl = e.keyHighlights.length ? ` | highlights: ${e.keyHighlights.join('; ')}` : '';
      return `- ${e.type} | ${e.title || 'Untitled'}${e.organization ? ` at ${e.organization}` : ''}${tags}${hl}`;
    })
    .join('\n');

  const g = input.goals;
  const userMsg = `EXPERIENCE ENTRIES:
${entryLines || '(none)'}

GOALS & VALUES:
Vision: ${g?.visionText?.trim() || '(not provided)'}
Limits: ${g?.limitsText?.trim() || '(not provided)'}
Identity: ${g?.identityText?.trim() || '(not provided)'}`;

  return { system: SYSTEM, prompt: userMsg };
}

export function skillAnalysisStream(input: { entries: Entry[]; goals: GoalsDocument | null }) {
  const { system, prompt } = buildSkillAnalysis(input);
  return getProvider().generateStream({ system, prompt, maxTokens: 2000, temperature: 0.4 });
}
