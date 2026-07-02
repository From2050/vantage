import { getProvider } from '@/lib/ai/provider';

// Lets the UI adapt to the active provider (e.g. hide web-search toggles for
// providers that can't search). Returns safe info only — never keys.
export async function GET() {
  try {
    const p = getProvider();
    return Response.json({ name: p.name, ...p.capabilities });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return Response.json({ name: 'none', webSearch: false, jsonSchema: false, tier: 'basic', error: message });
  }
}
