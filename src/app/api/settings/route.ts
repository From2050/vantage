import { maskKey, readProviderConfig, saveProviderSettings } from '@/lib/ai/provider';

// GET — active config with the key masked. Never returns the raw key.
export async function GET() {
  const config = readProviderConfig();
  if (!config) return Response.json(null);
  return Response.json({
    provider: config.provider,
    apiKeyMasked: maskKey(config.apiKey),
    hasKey: !!config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    tier: config.tier,
  });
}

// PUT — save one provider's settings and make it active. Per-provider settings
// are merged, so switching providers never loses a stored key; empty apiKey
// keeps that provider's previously stored key.
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const provider = body.provider;
  if (provider !== 'gemini' && provider !== 'openai-compat') {
    return new Response('provider must be gemini | openai-compat', { status: 400 });
  }

  saveProviderSettings(provider, {
    apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
    baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    tier: body.tier === 'strong' ? 'strong' : body.tier === 'basic' ? 'basic' : undefined,
  });

  // Validate the result resolves to a usable config.
  const resolved = readProviderConfig();
  if (!resolved || resolved.provider !== provider) {
    return new Response(
      provider === 'gemini'
        ? 'Gemini requires an API key'
        : 'OpenAI-compatible provider requires a base URL',
      { status: 400 },
    );
  }
  if (resolved.provider === 'openai-compat' && !resolved.model) {
    return new Response('OpenAI-compatible provider requires a model name', { status: 400 });
  }
  return Response.json({ ok: true });
}
