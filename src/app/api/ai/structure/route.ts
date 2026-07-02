import { structureEntry } from '@/lib/ai/structure';
import { ENTRY_TYPES } from '@/types';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawNotes = typeof body.rawNotes === 'string' ? body.rawNotes : '';
  if (!rawNotes.trim()) {
    return new Response('rawNotes is required', { status: 400 });
  }
  const currentType = ENTRY_TYPES.includes(body.type) ? body.type : undefined;
  const currentTitle = typeof body.title === 'string' ? body.title : undefined;

  try {
    const result = await structureEntry({ rawNotes, currentTitle, currentType });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`AI error: ${message}`, { status: 500 });
  }
}
