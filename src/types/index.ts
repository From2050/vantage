// Domain types used across API routes and UI. These mirror the Drizzle schema,
// with JSON columns surfaced as parsed arrays/objects.

export type EntryType = 'work' | 'education' | 'project' | 'activity';

export const ENTRY_TYPES: EntryType[] = ['work', 'education', 'project', 'activity'];

export interface Entry {
  id: string;
  title: string;
  type: EntryType;
  organization: string;
  dateFrom: string; // "YYYY" or "YYYY-MM"
  dateTo: string; // "YYYY", "YYYY-MM", or "present"
  rawNotes: string; // user's unedited input — always preserved
  refinedNarrative: string; // AI-organized, user-editable
  keyHighlights: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// Compact form sent to the Matcher (no long narrative/rawNotes).
export interface CompactEntry {
  id: string;
  title: string;
  type: EntryType;
  organization: string;
  dateFrom: string;
  dateTo: string;
  keyHighlights: string[];
  tags: string[];
}

export type SkillCategory = 'technical' | 'tool' | 'domain' | 'soft';

export const SKILL_CATEGORIES: SkillCategory[] = ['technical', 'tool', 'domain', 'soft'];

// Evidence weight: 3 = core work of that entry, 2 = substantial use, 1 = mentioned.
export type EvidenceWeight = 1 | 2 | 3;

export interface SkillEvidence {
  entryId: string;
  weight: EvidenceWeight;
}

// A curated skill in the user's portfolio, evidenced by weighted entry links.
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  evidence: SkillEvidence[];
  createdAt: number;
  updatedAt: number;
}

export interface Profile {
  id: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  updatedAt: number;
}

export interface GoalsDocument {
  id: string;
  visionText: string;
  limitsText: string;
  identityText: string;
  aiSummary: string;
  updatedAt: number;
}

export interface JDDigest {
  summary: string; // 2–4 sentence role overview
  keywords: string[]; // technical terms, tools, domain keywords
  requirements: string[]; // must-have qualifications / responsibilities
  niceToHave: string[]; // preferred / bonus qualifications
  roleLevel: string; // e.g. "mid-level", "senior", "lead"
  context: string; // company type, team context (if inferable)
}

export interface JDSession {
  id: string;
  filename: string;
  rawContent: string;
  digest: JDDigest;
  createdAt: number;
}

export interface MatchItem {
  entryId: string;
  score: number; // 0–10
  rationale: string;
  framingNote: string;
}

export interface MatchResult {
  matches: MatchItem[];
  gaps: string[];
}

export interface ResumeOutput {
  id: string;
  jdSessionId: string;
  selectedEntryIds: string[];
  generatedResume: string; // Markdown
  createdAt: number;
}
