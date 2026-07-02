import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry, rowToGoals, rowToJDSession } from '@/lib/db/mappers';
import { listSkills } from '@/lib/db/skills';
import {
  adjacentPathsStream,
  buildAdjacent,
  buildPositioning,
  buildRoadmap,
  marketResearch,
  positioningStream,
  roadmapStream,
  type PathContext,
} from '@/lib/ai/paths';
import { textStreamToResponse } from '@/lib/ai/stream';
import { USER_ID } from '@/lib/constants';

// One endpoint, three analyses: positioning | adjacent | roadmap.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = body.mode;
  if (!['positioning', 'adjacent', 'roadmap'].includes(mode)) {
    return new Response('mode must be positioning | adjacent | roadmap', { status: 400 });
  }

  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  if (entries.length === 0) {
    return new Response('Add some Story Bank entries first.', { status: 400 });
  }
  const goalsRow = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();
  const ctx: PathContext = {
    skills: listSkills(),
    entries,
    goals: goalsRow ? rowToGoals(goalsRow) : null,
  };

  // Assemble market reference data (JD digest and/or provider-optional web search).
  const marketParts: string[] = [];
  if (typeof body.jdSessionId === 'string' && body.jdSessionId) {
    const row = db
      .select()
      .from(schema.jdSessions)
      .where(eq(schema.jdSessions.id, body.jdSessionId))
      .get();
    if (row) {
      const session = rowToJDSession(row);
      marketParts.push(`Uploaded JD digest:\n${JSON.stringify(session.digest, null, 2)}`);
    }
  }
  const target = typeof body.target === 'string' ? body.target.trim() : '';
  if (body.useWebSearch === true) {
    try {
      const topic = target || 'roles adjacent to this skill set';
      const research = await marketResearch(topic);
      if (research) marketParts.push(`Live web research:\n${research}`);
    } catch {
      // Research is best-effort; the analysis proceeds without it.
    }
  }
  const market = marketParts.join('\n\n');

  if (mode === 'roadmap' && !target) {
    return new Response('target is required for roadmap', { status: 400 });
  }

  // Agent path: return the assembled context + prompt WITHOUT calling any LLM,
  // so an external agent (MCP / API) can reason with its own model for free.
  if (body.contextOnly === true) {
    const built =
      mode === 'positioning'
        ? buildPositioning(ctx)
        : mode === 'adjacent'
          ? buildAdjacent(ctx, market)
          : buildRoadmap(ctx, target, market);
    return Response.json({
      ...built,
      meta: {
        mode,
        target: target || undefined,
        skillCount: ctx.skills.length,
        entryCount: ctx.entries.length,
        marketIncluded: !!market,
        writeBack:
          mode === 'roadmap'
            ? 'POST /api/path-plans { targetRole, content }'
            : `POST /api/analyses { kind: "${mode === 'positioning' ? 'positioning' : 'adjacent'}", content, source: "agent" }`,
      },
    });
  }

  try {
    let stream: AsyncIterable<string>;
    if (mode === 'positioning') {
      stream = await positioningStream(ctx);
    } else if (mode === 'adjacent') {
      stream = await adjacentPathsStream(ctx, market);
    } else {
      stream = await roadmapStream(ctx, target, market);
    }
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Analysis failed: ${message}`, { status: 500 });
  }
}
