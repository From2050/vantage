import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToGoals } from '@/lib/db/mappers';
import { USER_ID } from '@/lib/constants';

export async function GET() {
  const row = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();
  return Response.json(row ? rowToGoals(row) : null);
}

// Partial upsert: only fields present in the body change; others are preserved.
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const existing = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();

  const pick = (key: 'visionText' | 'limitsText' | 'identityText' | 'aiSummary') =>
    typeof body[key] === 'string' ? body[key] : existing?.[key] ?? '';

  const fields = {
    visionText: pick('visionText'),
    limitsText: pick('limitsText'),
    identityText: pick('identityText'),
    aiSummary: pick('aiSummary'),
    updatedAt: Date.now(),
  };

  if (existing) {
    db.update(schema.goalsDocument).set(fields).where(eq(schema.goalsDocument.id, USER_ID)).run();
  } else {
    db.insert(schema.goalsDocument).values({ id: USER_ID, ...fields }).run();
  }

  const row = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get()!;
  return Response.json(rowToGoals(row));
}
