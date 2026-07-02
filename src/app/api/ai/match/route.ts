import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry, rowToJDSession } from '@/lib/db/mappers';
import { matchEntries } from '@/lib/ai/match';
import type { CompactEntry } from '@/types';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jdSessionId = body.jdSessionId;
  if (typeof jdSessionId !== 'string') {
    return new Response('jdSessionId is required', { status: 400 });
  }

  const sessionRow = db
    .select()
    .from(schema.jdSessions)
    .where(eq(schema.jdSessions.id, jdSessionId))
    .get();
  if (!sessionRow) return new Response('JD session not found', { status: 404 });
  const session = rowToJDSession(sessionRow);

  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  if (entries.length === 0) {
    return Response.json({
      matches: [],
      gaps: ['No Story Bank entries yet — add some experiences to match against.'],
    });
  }

  const compact: CompactEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    organization: e.organization,
    dateFrom: e.dateFrom,
    dateTo: e.dateTo,
    keyHighlights: e.keyHighlights,
    tags: e.tags,
  }));

  try {
    const result = await matchEntries(session.digest, compact);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Match failed: ${message}`, { status: 500 });
  }
}
