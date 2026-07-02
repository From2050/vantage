import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export async function GET() {
  const rows = db.select().from(schema.pathPlans).orderBy(desc(schema.pathPlans.createdAt)).all();
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const content = body.content;
  if (typeof content !== 'string' || !content.trim()) {
    return new Response('content is required', { status: 400 });
  }
  const row = {
    id: crypto.randomUUID(),
    targetRole: typeof body.targetRole === 'string' ? body.targetRole : '',
    content,
    createdAt: Date.now(),
  };
  db.insert(schema.pathPlans).values(row).run();
  return Response.json(row, { status: 201 });
}
