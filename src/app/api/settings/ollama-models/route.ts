// Server-side probe of a local Ollama instance (avoids browser CORS).
// GET ?baseUrl=http://localhost:11434 — returns { models: string[] } or { error }.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('baseUrl') || 'http://localhost:11434';
  // Only probe local hosts — this endpoint is not a general-purpose proxy.
  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    return Response.json({ error: 'Invalid base URL' });
  }
  if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(origin.hostname)) {
    return Response.json({ error: 'Model detection only probes localhost' });
  }

  try {
    const res = await fetch(`${origin.origin}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return Response.json({ error: `Ollama responded ${res.status}` });
    const data = (await res.json()) as { models?: { name?: string }[] };
    const models = (data.models ?? []).map((m) => m.name).filter((n): n is string => !!n);
    return Response.json({ models });
  } catch {
    return Response.json({ error: 'Ollama not reachable — is it running? (ollama serve)' });
  }
}
