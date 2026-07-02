import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry } from '@/lib/db/mappers';
import { listSkills } from '@/lib/db/skills';
import { extractSkills } from '@/lib/ai/extractSkills';
import type { SkillCategory } from '@/types';

// Re-extract the skill portfolio from all entries. Upserts by (case-insensitive)
// name so user curation survives: existing skills keep their id and category;
// evidence links are refreshed; nothing the user created is deleted.
export async function POST() {
  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  if (entries.length === 0) {
    return new Response('Add some Story Bank entries first.', { status: 400 });
  }

  const existing = listSkills();

  let extracted;
  try {
    extracted = await extractSkills(
      entries,
      existing.map((s) => ({ name: s.name, category: s.category as SkillCategory })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Extraction failed: ${message}`, { status: 500 });
  }

  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s]));
  const now = Date.now();

  for (const s of extracted) {
    const match = byName.get(s.name.toLowerCase());
    let skillId: string;
    if (match) {
      skillId = match.id; // keep user's name casing + category
      db.update(schema.skills).set({ updatedAt: now }).where(eq(schema.skills.id, skillId)).run();
    } else {
      skillId = crypto.randomUUID();
      db.insert(schema.skills)
        .values({ id: skillId, name: s.name, category: s.category, createdAt: now, updatedAt: now })
        .run();
    }
    // Refresh weighted evidence links for this skill from the new extraction.
    db.delete(schema.entrySkills).where(eq(schema.entrySkills.skillId, skillId)).run();
    for (const ev of s.evidence) {
      db.insert(schema.entrySkills)
        .values({ entryId: ev.entryId, skillId, weight: ev.weight })
        .onConflictDoNothing()
        .run();
    }
  }

  return Response.json(listSkills());
}
