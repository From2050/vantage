import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export async function DELETE(_req: Request, ctx: RouteContext<'/api/path-plans/[id]'>) {
  const { id } = await ctx.params;
  db.delete(schema.pathPlans).where(eq(schema.pathPlans.id, id)).run();
  return new Response(null, { status: 204 });
}
