import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

const KINDS = ['skill', 'positioning', 'adjacent'];

// GET /api/analyses?kind=skill&latest=1 — list (or latest single) analyses.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  const latest = url.searchParams.get('latest') === '1';

  let rows = kind
    ? db.select().from(schema.analyses).where(eq(schema.analyses.kind, kind)).orderBy(desc(schema.analyses.createdAt)).all()
    : db.select().from(schema.analyses).orderBy(desc(schema.analyses.createdAt)).all();
  if (latest) rows = rows.slice(0, 1);
  return Response.json(latest ? (rows[0] ?? null) : rows);
}

// POST — persist an analysis. source: 'app' (in-app AI) | 'agent' (external agent write-back).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  const content = body.content;
  if (!KINDS.includes(kind) || typeof content !== 'string' || !content.trim()) {
    return new Response(`kind (${KINDS.join(' | ')}) and content are required`, { status: 400 });
  }
  const row = {
    id: crypto.randomUUID(),
    kind,
    content,
    source: body.source === 'agent' ? 'agent' : 'app',
    createdAt: Date.now(),
  };
  db.insert(schema.analyses).values(row).run();
  return Response.json(row, { status: 201 });
}
