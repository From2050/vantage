import { getProvider } from './provider';
import type { Entry, GoalsDocument, JDDigest, Profile } from '@/types';

const SYSTEM = `You write a tailored, professional cover letter in plain prose (3–4 short paragraphs).

ABSOLUTE CONSTRAINTS — never violate:
- Use ONLY evidence from the provided entries. Never invent achievements, metrics, numbers, or experience.
- Preserve the candidate's verb strength; never upgrade "helped/supported/contributed" to "led/owned/drove/managed".
- Do not fabricate knowledge about the company beyond the provided company info. If little company info is given, keep company references general and honest.
- No empty flattery, no clichés. Be specific and grounded.

STRUCTURE:
- Opening: who the candidate is, the role they're applying for, and a genuine hook tied to the company or role.
- Body (1–2 paragraphs): 2–3 specific, evidenced reasons they fit, mapped to the JD's key requirements.
- Closing: brief enthusiasm + a call to action.

Output the letter text only. You may open with "Dear Hiring Team," and you may end with a sign-off using the candidate's name if provided. Plain text/markdown — no address block.`;

export function coverLetterStream(input: {
  digest: JDDigest;
  selectedEntries: Entry[];
  profile: Profile | null;
  goalsDocument: GoalsDocument | null;
  companyName: string;
  companyInfo: string;
}) {
  const entries = input.selectedEntries.map((e) => ({
    title: e.title,
    type: e.type,
    organization: e.organization,
    dateFrom: e.dateFrom,
    dateTo: e.dateTo,
    narrative: e.refinedNarrative || e.rawNotes,
    keyHighlights: e.keyHighlights,
  }));

  const name = input.profile?.fullName?.trim();
  const vision = input.goalsDocument?.visionText?.trim();

  const userMsg = `CANDIDATE NAME: ${name || '(not provided — omit sign-off name)'}
${vision ? `CANDIDATE MOTIVATION (tone only, not evidence): ${vision.slice(0, 400)}\n` : ''}
TARGET COMPANY: ${input.companyName || '(not specified)'}
COMPANY INFO:
${input.companyInfo.trim() || '(none provided — keep company references general)'}

JOB DESCRIPTION DIGEST:
${JSON.stringify(input.digest, null, 2)}

CANDIDATE EVIDENCE (selected entries):
${JSON.stringify(entries, null, 2)}`;

  return getProvider().generateStream({
    system: SYSTEM,
    prompt: userMsg,
    maxTokens: 1500,
    temperature: 0.4,
  });
}
