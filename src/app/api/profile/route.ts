import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToProfile } from '@/lib/db/mappers';
import { USER_ID } from '@/lib/constants';

export async function GET() {
  const row = db.select().from(schema.profile).where(eq(schema.profile.id, USER_ID)).get();
  return Response.json(row ? rowToProfile(row) : null);
}

// Partial upsert: only provided fields change.
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const existing = db.select().from(schema.profile).where(eq(schema.profile.id, USER_ID)).get();

  const str = (key: 'fullName' | 'headline' | 'email' | 'phone' | 'location') =>
    typeof body[key] === 'string' ? body[key] : existing?.[key] ?? '';

  const links = Array.isArray(body.links)
    ? body.links.filter((l: unknown): l is string => typeof l === 'string')
    : existing
      ? undefined
      : [];

  const fields = {
    fullName: str('fullName'),
    headline: str('headline'),
    email: str('email'),
    phone: str('phone'),
    location: str('location'),
    links: links !== undefined ? JSON.stringify(links) : existing!.links,
    updatedAt: Date.now(),
  };

  if (existing) {
    db.update(schema.profile).set(fields).where(eq(schema.profile.id, USER_ID)).run();
  } else {
    db.insert(schema.profile).values({ id: USER_ID, ...fields }).run();
  }

  const row = db.select().from(schema.profile).where(eq(schema.profile.id, USER_ID)).get()!;
  return Response.json(rowToProfile(row));
}
