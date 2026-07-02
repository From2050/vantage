import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { USER_ID } from '@/lib/constants';

export type ProviderKind = 'gemini' | 'openai-compat';

// Resolved config for the ACTIVE provider (what adapters consume).
export interface ProviderConfig {
  provider: ProviderKind;
  apiKey: string; // API key or Bearer token; stored only in local SQLite
  baseUrl: string; // openai-compat only, e.g. http://localhost:11434/v1
  model: string;
  tier: 'strong' | 'basic';
}

// Stored shape keeps EACH provider's settings so switching back and forth
// never loses a saved key.
interface StoredSettings {
  active?: ProviderKind;
  gemini?: { apiKey?: string; model?: string };
  openaiCompat?: { baseUrl?: string; apiKey?: string; model?: string; tier?: 'strong' | 'basic' };
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function readStored(): StoredSettings {
  const row = db.select().from(schema.settings).where(eq(schema.settings.id, USER_ID)).get();
  if (!row) return {};
  try {
    return JSON.parse(row.providerConfig) as StoredSettings;
  } catch {
    return {};
  }
}

// Resolve the active config: DB settings first; env GEMINI_API_KEY fills a
// missing Gemini key (dev fallback).
export function readProviderConfig(): ProviderConfig | null {
  const stored = readStored();
  const active = stored.active ?? (stored.gemini?.apiKey || process.env.GEMINI_API_KEY ? 'gemini' : undefined);

  if (active === 'openai-compat' && stored.openaiCompat?.baseUrl) {
    const c = stored.openaiCompat;
    return {
      provider: 'openai-compat',
      apiKey: c.apiKey ?? '', // local servers (Ollama) need no key
      baseUrl: (c.baseUrl ?? '').replace(/\/$/, ''),
      model: c.model ?? '',
      tier: c.tier === 'strong' ? 'strong' : 'basic',
    };
  }

  const geminiKey = stored.gemini?.apiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      baseUrl: '',
      model: stored.gemini?.model || DEFAULT_GEMINI_MODEL,
      tier: 'strong',
    };
  }
  return null;
}

// Merge-save one provider's settings and make it active. Empty apiKey keeps
// the previously stored key for THAT provider.
export function saveProviderSettings(
  provider: ProviderKind,
  fields: { apiKey?: string; baseUrl?: string; model?: string; tier?: 'strong' | 'basic' },
): void {
  const stored = readStored();
  if (provider === 'gemini') {
    stored.gemini = {
      apiKey: fields.apiKey?.trim() || stored.gemini?.apiKey || process.env.GEMINI_API_KEY || '',
      model: fields.model?.trim() || stored.gemini?.model || DEFAULT_GEMINI_MODEL,
    };
  } else {
    stored.openaiCompat = {
      baseUrl: fields.baseUrl?.trim() || stored.openaiCompat?.baseUrl || '',
      apiKey: fields.apiKey?.trim() || stored.openaiCompat?.apiKey || '',
      model: fields.model?.trim() || stored.openaiCompat?.model || '',
      tier: fields.tier ?? stored.openaiCompat?.tier ?? 'basic',
    };
  }
  stored.active = provider;

  const now = Date.now();
  const existing = db.select().from(schema.settings).where(eq(schema.settings.id, USER_ID)).get();
  const json = JSON.stringify(stored);
  if (existing) {
    db.update(schema.settings)
      .set({ providerConfig: json, updatedAt: now })
      .where(eq(schema.settings.id, USER_ID))
      .run();
  } else {
    db.insert(schema.settings).values({ id: USER_ID, providerConfig: json, updatedAt: now }).run();
  }
  bumpConfigVersion();
}

// Cache invalidation: the provider singleton is keyed to this version — saving
// settings bumps it so the next getProvider() rebuilds from fresh config.
const globalForVersion = globalThis as unknown as { aiConfigVersion?: number };

export function configVersion(): number {
  return globalForVersion.aiConfigVersion ?? 0;
}

export function bumpConfigVersion(): void {
  globalForVersion.aiConfigVersion = configVersion() + 1;
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
