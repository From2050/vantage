import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry } from '@/lib/db/mappers';
import { ENTRY_TYPES } from '@/types';

export async function GET(_req: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { id } = await ctx.params;
  const row = db.select().from(schema.entries).where(eq(schema.entries.id, id)).get();
  if (!row) return new Response('Not found', { status: 404 });
  return Response.json(rowToEntry(row));
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { id } = await ctx.params;
  const existing = db.select().from(schema.entries).where(eq(schema.entries.id, id)).get();
  if (!existing) return new Response('Not found', { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  for (const k of ['title', 'organization', 'dateFrom', 'dateTo', 'rawNotes', 'refinedNarrative'] as const) {
    if (typeof body[k] === 'string') updates[k] = body[k];
  }
  if (ENTRY_TYPES.includes(body.type)) updates.type = body.type;
  if (Array.isArray(body.keyHighlights)) updates.keyHighlights = JSON.stringify(body.keyHighlights);
  if (Array.isArray(body.tags)) updates.tags = JSON.stringify(body.tags);

  db.update(schema.entries).set(updates).where(eq(schema.entries.id, id)).run();
  const row = db.select().from(schema.entries).where(eq(schema.entries.id, id)).get()!;
  return Response.json(rowToEntry(row));
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/entries/[id]'>) {
  const { id } = await ctx.params;
  db.delete(schema.entries).where(eq(schema.entries.id, id)).run();
  return new Response(null, { status: 204 });
}
