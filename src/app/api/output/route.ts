import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToResumeOutput } from '@/lib/db/mappers';

export async function GET() {
  const rows = db
    .select()
    .from(schema.resumeOutputs)
    .orderBy(desc(schema.resumeOutputs.createdAt))
    .all();
  return Response.json(rows.map(rowToResumeOutput));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jdSessionId = body.jdSessionId;
  const generatedResume = body.generatedResume;
  if (typeof jdSessionId !== 'string' || typeof generatedResume !== 'string' || !generatedResume.trim()) {
    return new Response('jdSessionId and generatedResume are required', { status: 400 });
  }

  const row = {
    id: crypto.randomUUID(),
    jdSessionId,
    selectedEntryIds: JSON.stringify(Array.isArray(body.selectedEntryIds) ? body.selectedEntryIds : []),
    generatedResume,
    createdAt: Date.now(),
  };
  db.insert(schema.resumeOutputs).values(row).run();
  return Response.json(rowToResumeOutput(row), { status: 201 });
}
