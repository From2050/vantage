import { db, schema } from '@/lib/db';
import { USER_ID } from '@/lib/constants';
import persona from './persona.json';

// Loads a fictional demo profile so first-time users see a populated app in one
// click. Clears user-data tables (NOT settings, so the provider key is kept),
// then inserts the persona. `hasUserData()` guards the API route from wiping a
// real user's data.

const USER_DATA_TABLES = [
  schema.entrySkills,
  schema.skills,
  schema.entries,
  schema.goalsDocument,
  schema.profile,
  schema.jdSessions,
  schema.resumeOutputs,
  schema.coverLetters,
  schema.pathPlans,
  schema.analyses,
];

export function hasUserData(): boolean {
  return db.select().from(schema.entries).all().length > 0;
}

export function seedDemo(): { entries: number; skills: number } {
  const now = Date.now();

  for (const table of USER_DATA_TABLES) db.delete(table).run();

  persona.entries.forEach((e, i) => {
    db.insert(schema.entries)
      .values({
        id: e.id,
        title: e.title,
        type: e.type,
        organization: e.organization,
        dateFrom: e.dateFrom,
        dateTo: e.dateTo,
        rawNotes: e.rawNotes,
        refinedNarrative: e.refinedNarrative,
        keyHighlights: JSON.stringify(e.keyHighlights),
        tags: JSON.stringify(e.tags),
        createdAt: now,
        updatedAt: now - i, // preserve order in updatedAt-desc lists
      })
      .run();
  });

  for (const s of persona.skills) {
    db.insert(schema.skills)
      .values({ id: s.id, name: s.name, category: s.category, createdAt: now, updatedAt: now })
      .run();
  }
  for (const l of persona.entrySkills) {
    db.insert(schema.entrySkills)
      .values({ entryId: l.entryId, skillId: l.skillId, weight: l.weight })
      .run();
  }

  db.insert(schema.goalsDocument)
    .values({
      id: USER_ID,
      visionText: persona.goals.visionText,
      limitsText: persona.goals.limitsText,
      identityText: persona.goals.identityText,
      aiSummary: '',
      updatedAt: now,
    })
    .run();

  db.insert(schema.profile)
    .values({
      id: USER_ID,
      fullName: persona.profile.fullName,
      headline: persona.profile.headline,
      email: persona.profile.email,
      phone: persona.profile.phone,
      location: persona.profile.location,
      links: JSON.stringify(persona.profile.links),
      updatedAt: now,
    })
    .run();

  for (const a of persona.analyses) {
    db.insert(schema.analyses)
      .values({ id: a.id, kind: a.kind, content: a.content, source: a.source, createdAt: now })
      .run();
  }

  return { entries: persona.entries.length, skills: persona.skills.length };
}
