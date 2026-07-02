import type { entries, goalsDocument, jdSessions, profile, resumeOutputs } from './schema';
import type {
  Entry,
  EntryType,
  GoalsDocument,
  JDDigest,
  JDSession,
  Profile,
  ResumeOutput,
} from '@/types';

export function safeJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function rowToEntry(row: typeof entries.$inferSelect): Entry {
  return {
    id: row.id,
    title: row.title,
    type: row.type as EntryType,
    organization: row.organization,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    rawNotes: row.rawNotes,
    refinedNarrative: row.refinedNarrative,
    keyHighlights: safeJsonArray(row.keyHighlights),
    tags: safeJsonArray(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToProfile(row: typeof profile.$inferSelect): Profile {
  return {
    id: row.id,
    fullName: row.fullName,
    headline: row.headline,
    email: row.email,
    phone: row.phone,
    location: row.location,
    links: safeJsonArray(row.links),
    updatedAt: row.updatedAt,
  };
}

export function rowToGoals(row: typeof goalsDocument.$inferSelect): GoalsDocument {
  return {
    id: row.id,
    visionText: row.visionText,
    limitsText: row.limitsText,
    identityText: row.identityText,
    aiSummary: row.aiSummary,
    updatedAt: row.updatedAt,
  };
}

export function rowToJDSession(row: typeof jdSessions.$inferSelect): JDSession {
  let digest: JDDigest;
  try {
    digest = JSON.parse(row.digest) as JDDigest;
  } catch {
    digest = { summary: '', keywords: [], requirements: [], niceToHave: [], roleLevel: '', context: '' };
  }
  return {
    id: row.id,
    filename: row.filename,
    rawContent: row.rawContent,
    digest,
    createdAt: row.createdAt,
  };
}

export function rowToResumeOutput(row: typeof resumeOutputs.$inferSelect): ResumeOutput {
  return {
    id: row.id,
    jdSessionId: row.jdSessionId,
    selectedEntryIds: safeJsonArray(row.selectedEntryIds),
    generatedResume: row.generatedResume,
    createdAt: row.createdAt,
  };
}
