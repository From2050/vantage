import { getProvider } from './provider';
import type { Entry, GoalsDocument, JDDigest } from '@/types';

const SYSTEM = `You compose the BODY of a tailored résumé in Markdown from a candidate's SELECTED experience entries and a job description digest. Do NOT output a name or contact header — the application adds that separately.

ABSOLUTE CONSTRAINTS — never violate, even slightly:
- Only use evidence present in the provided entries. Do NOT invent details, outcomes, metrics, numbers, percentages, tools, dates, team sizes, or achievements.
- Preserve verb strength EXACTLY as written in the entries. If an entry says "helped", "supported", "contributed to", "assisted with" — keep that strength. NEVER upgrade to "led", "owned", "drove", "spearheaded", "managed", "headed", "orchestrated", or similar.
- Mirror JD keywords ONLY where the candidate's evidence genuinely supports them. Never claim a skill not evidenced in a selected entry.
- If a JD requirement has no supporting evidence, do not pad or fabricate. Omit it.
- Do not list a skill unless it appears in at least one selected entry's content.
- Do not imply sole ownership of shared or team work.

ROUTING — place each entry in the correct section ONLY (never repeat an entry across sections):
- "experience" entries → ## Experience
- "projects" entries → ## Projects
- "education" entries → ## Education

FORMATTING:
- Use the JD digest to choose emphasis and ordering within Experience (most relevant first, otherwise reverse-chronological).
- Dates: render "dateFrom – dateTo". If a date is missing/empty, omit it gracefully (no stray dashes). If both are missing, omit the date entirely.
- Experience & Projects entries: a header line "**[Title]** | [Organization] | [dates]", then a 2–4 sentence narrative drawn strictly from the entry, then 2–3 bullet highlights from the entry.
- Education entries: a single line "**[Degree/Title]** | [School] | [dates]" — no narrative, no bullets, unless a notable detail exists in the entry (then one short line).
- Skills: group evidenced skills under short labels (e.g. "**Hardware:** …", "**Languages:** …", "**Tools:** …"). Only skills evidenced in the selected entries.

OUTPUT (Markdown only, no preamble; omit any section that has no entries — but always include Summary and Skills):
## Summary
[2–3 sentences tailored to this role; lead with the strongest genuine fit]

## Experience
…

## Projects
…

## Education
…

## Skills
…`;

function toBlock(e: Entry) {
  return {
    title: e.title,
    organization: e.organization,
    dateFrom: e.dateFrom,
    dateTo: e.dateTo,
    narrative: e.refinedNarrative || e.rawNotes,
    keyHighlights: e.keyHighlights,
  };
}

export function generateResumeStream(input: {
  digest: JDDigest;
  selectedEntries: Entry[];
  goalsDocument: GoalsDocument | null;
}) {
  const experience = input.selectedEntries.filter((e) => e.type === 'work').map(toBlock);
  const projects = input.selectedEntries
    .filter((e) => e.type === 'project' || e.type === 'activity')
    .map(toBlock);
  const education = input.selectedEntries.filter((e) => e.type === 'education').map(toBlock);

  const vision = input.goalsDocument?.visionText?.trim();
  const visionBlock = vision
    ? `\nCANDIDATE VISION (for summary TONE only — not evidence):\n${vision.slice(0, 600)}\n`
    : '';

  const userMsg = `JOB DESCRIPTION DIGEST:
${JSON.stringify(input.digest, null, 2)}
${visionBlock}
EXPERIENCE ENTRIES (→ ## Experience):
${JSON.stringify(experience, null, 2)}

PROJECT ENTRIES (→ ## Projects):
${JSON.stringify(projects, null, 2)}

EDUCATION ENTRIES (→ ## Education):
${JSON.stringify(education, null, 2)}`;

  return getProvider().generateStream({
    system: SYSTEM,
    prompt: userMsg,
    maxTokens: 2600,
    temperature: 0.3,
  });
}
