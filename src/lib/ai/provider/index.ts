import type { AIProvider } from './types';
import { GeminiProvider } from './gemini';
import { OpenAICompatProvider } from './openaiCompat';
import { configVersion, readProviderConfig } from './config';

export type { AIProvider, AICapabilities, ChatMessage, TextRequest, JSONRequest, JSONSchema, SearchResponse, SearchSource } from './types';
export { readProviderConfig, saveProviderSettings, maskKey, DEFAULT_GEMINI_MODEL } from './config';
export type { ProviderConfig, ProviderKind } from './config';

// Provider selection: DB settings (user-facing, /settings) with GEMINI_API_KEY
// env as dev fallback. The singleton is keyed to the settings version so saving
// new settings takes effect immediately without a restart.
const globalForProvider = globalThis as unknown as {
  aiProvider?: { instance: AIProvider; version: number };
};

export function getProvider(): AIProvider {
  const version = configVersion();
  const cached = globalForProvider.aiProvider;
  if (cached && cached.version === version) return cached.instance;

  const config = readProviderConfig();
  if (!config) {
    throw new Error('No AI provider configured — open Settings and connect a model.');
  }

  const instance: AIProvider =
    config.provider === 'openai-compat'
      ? new OpenAICompatProvider(config)
      : new GeminiProvider(config);

  globalForProvider.aiProvider = { instance, version };
  return instance;
}
