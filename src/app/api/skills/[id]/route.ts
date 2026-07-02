import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { SKILL_CATEGORIES } from '@/types';

export async function PATCH(req: Request, ctx: RouteContext<'/api/skills/[id]'>) {
  const { id } = await ctx.params;
  const existing = db.select().from(schema.skills).where(eq(schema.skills.id, id)).get();
  if (!existing) return new Response('Not found', { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (SKILL_CATEGORIES.includes(body.category)) updates.category = body.category;

  db.update(schema.skills).set(updates).where(eq(schema.skills.id, id)).run();
  const row = db.select().from(schema.skills).where(eq(schema.skills.id, id)).get()!;
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/skills/[id]'>) {
  const { id } = await ctx.params;
  db.delete(schema.entrySkills).where(eq(schema.entrySkills.skillId, id)).run();
  db.delete(schema.skills).where(eq(schema.skills.id, id)).run();
  return new Response(null, { status: 204 });
}
