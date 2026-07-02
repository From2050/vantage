import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export async function GET() {
  const rows = db
    .select()
    .from(schema.coverLetters)
    .orderBy(desc(schema.coverLetters.createdAt))
    .all();
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jdSessionId = body.jdSessionId;
  const content = body.content;
  if (typeof jdSessionId !== 'string' || typeof content !== 'string' || !content.trim()) {
    return new Response('jdSessionId and content are required', { status: 400 });
  }
  const row = {
    id: crypto.randomUUID(),
    jdSessionId,
    companyName: typeof body.companyName === 'string' ? body.companyName : '',
    content,
    createdAt: Date.now(),
  };
  db.insert(schema.coverLetters).values(row).run();
  return Response.json(row, { status: 201 });
}
