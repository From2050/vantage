import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry, rowToGoals } from '@/lib/db/mappers';
import { getProvider, type ChatMessage } from '@/lib/ai/provider';
import { textStreamToResponse } from '@/lib/ai/stream';
import { USER_ID } from '@/lib/constants';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return new Response('messages are required', { status: 400 });

  // Build the profile system prompt from the full Story Bank + Goals.
  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  const goalsRow = db
    .select()
    .from(schema.goalsDocument)
    .where(eq(schema.goalsDocument.id, USER_ID))
    .get();
  const goals = goalsRow ? rowToGoals(goalsRow) : null;

  const entryLines =
    entries
      .map((e) => {
        const dates = `${e.dateFrom || '?'}–${e.dateTo || '?'}`;
        const org = e.organization ? ` at ${e.organization}` : '';
        const hl = e.keyHighlights.length ? ` | highlights: ${e.keyHighlights.join('; ')}` : '';
        const tags = e.tags.length ? ` | tags: ${e.tags.join(', ')}` : '';
        return `- ${e.type} | ${e.title || 'Untitled'}${org} (${dates})${hl}${tags}`;
      })
      .join('\n') || '(no Story Bank entries yet)';

  const system = `You are a career advisor with access to the user's full professional profile. Be specific and grounded in their actual evidence — never give generic advice as if you don't know them.

STORY BANK SUMMARY:
${entryLines}

GOALS & VALUES:
Vision: ${goals?.visionText?.trim() || '(not provided)'}
Limits: ${goals?.limitsText?.trim() || '(not provided)'}
Identity: ${goals?.identityText?.trim() || '(not provided)'}

Rules:
- Reference specific entries by their title when discussing the user's background.
- Clearly distinguish what is "well-evidenced now" from what "would need 6–12 months of development".
- When suggesting paths or plans, be concrete and tie them to the user's stated goals and limits.
- Be honest about gaps; do not flatter. Keep answers focused and skimmable using short markdown.
- Respond in the language of the user's latest message.`;

  // Token safety: keep only the last ~10 exchanges (20 messages). Role-alternation
  // quirks (e.g. first turn must be user) are the provider adapter's job.
  const history = messages
    .slice(-20)
    .filter(
      (m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
    );
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return new Response('The last message must be from the user', { status: 400 });
  }

  try {
    const stream = await getProvider().generateStream({
      system,
      messages: history,
      maxTokens: 1500,
      temperature: 0.5,
    });
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`Chat failed: ${message}`, { status: 500 });
  }
}
