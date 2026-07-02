import { exploreStream } from '@/lib/ai/explore';
import { textStreamToResponse } from '@/lib/ai/stream';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const visionText = typeof body.visionText === 'string' ? body.visionText : '';
  const limitsText = typeof body.limitsText === 'string' ? body.limitsText : '';
  const identityText = typeof body.identityText === 'string' ? body.identityText : '';

  if (!visionText.trim() && !limitsText.trim() && !identityText.trim()) {
    return new Response('Fill in at least one section before exploring.', { status: 400 });
  }

  try {
    const stream = await exploreStream({ visionText, limitsText, identityText });
    return textStreamToResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Response(`AI error: ${message}`, { status: 500 });
  }
}
