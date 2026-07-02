import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToJDSession } from '@/lib/db/mappers';

export async function GET(_req: Request, ctx: RouteContext<'/api/jd-sessions/[id]'>) {
  const { id } = await ctx.params;
  const row = db.select().from(schema.jdSessions).where(eq(schema.jdSessions.id, id)).get();
  if (!row) return new Response('Not found', { status: 404 });
  return Response.json(rowToJDSession(row));
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/jd-sessions/[id]'>) {
  const { id } = await ctx.params;
  db.delete(schema.jdSessions).where(eq(schema.jdSessions.id, id)).run();
  return new Response(null, { status: 204 });
}
