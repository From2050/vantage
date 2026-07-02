import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry, rowToGoals } from '@/lib/db/mappers';
import { buildSkillAnalysis, skillAnalysisStream } from '@/lib/ai/skillAnalysis';
import { textStreamToResponse } from '@/lib/ai/stream';
import { USER_ID } from '@/lib/constants';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  if (entries.length === 0) {
    return new Response('Add some Story Bank entries first.', { status: 400 });
  }
  const goalsRow = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();
  const input = { entries, goals: goalsRow ? rowToGoals(goalsRow) : null };

  // Agent path: assembled context + prompt, no LLM call (see paths route).
  if (body.contextOnly === true) {
    const built = buildSkillAnalysis(input);
    return Response.json({
      ...built,
      meta: {
        entryCount: entries.length,
        writeBack: 'POST /api/analyses { kind: "skill", content, source: "agent" }',
      },
    });
  }

  try {
    const stream = await skillAnalysisStream(input);
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Analysis failed: ${message}`, { status: 500 });
  }
}
