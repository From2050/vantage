import { getProvider } from '@/lib/ai/provider';

// Round-trip test of the ACTIVE (saved) provider config.
export async function POST() {
  const started = Date.now();
  try {
    const provider = getProvider();
    const text = await provider.generateText({
      prompt: 'Reply with exactly: ok',
      maxTokens: 20,
      temperature: 0,
    });
    return Response.json({
      ok: true,
      provider: provider.name,
      ms: Date.now() - started,
      sample: text.slice(0, 40),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return Response.json({ ok: false, error: message, ms: Date.now() - started }, { status: 200 });
  }
}
