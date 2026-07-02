import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry } from '@/lib/db/mappers';
import type { EntryType } from '@/types';
import { ENTRY_TYPES } from '@/types';

export async function GET() {
  const rows = db.select().from(schema.entries).orderBy(desc(schema.entries.updatedAt)).all();
  return Response.json(rows.map(rowToEntry));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const now = Date.now();
  const type: EntryType = ENTRY_TYPES.includes(body.type) ? body.type : 'work';

  const row = {
    id: crypto.randomUUID(),
    title: typeof body.title === 'string' ? body.title : '',
    type,
    organization: typeof body.organization === 'string' ? body.organization : '',
    dateFrom: typeof body.dateFrom === 'string' ? body.dateFrom : '',
    dateTo: typeof body.dateTo === 'string' ? body.dateTo : '',
    rawNotes: typeof body.rawNotes === 'string' ? body.rawNotes : '',
    refinedNarrative: typeof body.refinedNarrative === 'string' ? body.refinedNarrative : '',
    keyHighlights: JSON.stringify(Array.isArray(body.keyHighlights) ? body.keyHighlights : []),
    tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    createdAt: now,
    updatedAt: now,
  };

  db.insert(schema.entries).values(row).run();
  return Response.json(rowToEntry(row), { status: 201 });
}
