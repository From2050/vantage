import { organizeStream } from '@/lib/ai/organize';
import { textStreamToResponse } from '@/lib/ai/stream';
import { ENTRY_TYPES } from '@/types';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawNotes = typeof body.rawNotes === 'string' ? body.rawNotes : '';
  if (!rawNotes.trim()) {
    return new Response('rawNotes is required', { status: 400 });
  }
  const type = ENTRY_TYPES.includes(body.type) ? body.type : 'work';
  const title = typeof body.title === 'string' ? body.title : '';

  try {
    const stream = await organizeStream({ rawNotes, type, title });
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`AI error: ${message}`, { status: 500 });
  }
}
