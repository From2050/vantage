import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry, rowToGoals, rowToJDSession } from '@/lib/db/mappers';
import { generateResumeStream } from '@/lib/ai/generate';
import { textStreamToResponse } from '@/lib/ai/stream';
import { USER_ID } from '@/lib/constants';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jdSessionId = body.jdSessionId;
  const selectedEntryIds = body.selectedEntryIds;

  if (typeof jdSessionId !== 'string') {
    return new Response('jdSessionId is required', { status: 400 });
  }
  if (!Array.isArray(selectedEntryIds) || selectedEntryIds.length === 0) {
    return new Response('Select at least one entry', { status: 400 });
  }

  const sessionRow = db
    .select()
    .from(schema.jdSessions)
    .where(eq(schema.jdSessions.id, jdSessionId))
    .get();
  if (!sessionRow) return new Response('JD session not found', { status: 404 });
  const session = rowToJDSession(sessionRow);

  const entryRows = db
    .select()
    .from(schema.entries)
    .where(inArray(schema.entries.id, selectedEntryIds))
    .all();
  const selectedEntries = entryRows.map(rowToEntry);
  if (selectedEntries.length === 0) {
    return new Response('None of the selected entries were found', { status: 400 });
  }

  const goalsRow = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();
  const goalsDocument = goalsRow ? rowToGoals(goalsRow) : null;

  try {
    const stream = await generateResumeStream({
      digest: session.digest,
      selectedEntries,
      goalsDocument,
    });
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Generate failed: ${message}`, { status: 500 });
  }
}
