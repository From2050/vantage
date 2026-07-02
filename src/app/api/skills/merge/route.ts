import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Merge skill `fromId` into `toId`: move evidence links, delete the source.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { fromId, toId } = body;
  if (typeof fromId !== 'string' || typeof toId !== 'string' || fromId === toId) {
    return new Response('fromId and toId (distinct) are required', { status: 400 });
  }
  const from = db.select().from(schema.skills).where(eq(schema.skills.id, fromId)).get();
  const to = db.select().from(schema.skills).where(eq(schema.skills.id, toId)).get();
  if (!from || !to) return new Response('Skill not found', { status: 404 });

  const fromLinks = db
    .select()
    .from(schema.entrySkills)
    .where(eq(schema.entrySkills.skillId, fromId))
    .all();
  for (const l of fromLinks) {
    db.insert(schema.entrySkills)
      .values({ entryId: l.entryId, skillId: toId })
      .onConflictDoNothing()
      .run();
  }
  db.delete(schema.entrySkills).where(eq(schema.entrySkills.skillId, fromId)).run();
  db.delete(schema.skills).where(eq(schema.skills.id, fromId)).run();
  db.update(schema.skills).set({ updatedAt: Date.now() }).where(eq(schema.skills.id, toId)).run();

  return new Response(null, { status: 204 });
}
