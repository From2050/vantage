import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { DEFAULT_GEMINI_MODEL, type ProviderConfig } from './config';
import {
  parseJsonLoose,
  type AIProvider,
  type JSONRequest,
  type JSONSchema,
  type SearchResponse,
  type TextRequest,
} from './types';

// Gemini 2.5 models "think" by default, consuming output tokens. Disable it for
// predictable token usage and lower cost; rely on explicit prompting instead.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } } as const;

const TYPE_MAP: Record<JSONSchema['type'], Type> = {
  object: Type.OBJECT,
  array: Type.ARRAY,
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
};

function toGeminiSchema(s: JSONSchema): Schema {
  const out: Schema = { type: TYPE_MAP[s.type] };
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.required) out.required = s.required;
  if (s.propertyOrdering) out.propertyOrdering = s.propertyOrdering;
  if (s.items) out.items = toGeminiSchema(s.items);
  if (s.properties) {
    out.properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]),
    );
  }
  return out;
}

// Gemini requires alternating turns starting with 'user'.
function toContents(req: TextRequest) {
  if (req.messages?.length) {
    let contents = req.messages
      .filter((m) => m && typeof m.content === 'string')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    while (contents.length && contents[0].role === 'model') contents = contents.slice(1);
    return contents;
  }
  return req.prompt ?? '';
}

function baseConfig(req: TextRequest) {
  return {
    ...NO_THINKING,
    ...(req.system ? { systemInstruction: req.system } : {}),
    ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
    ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
  };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly capabilities = { webSearch: true, jsonSchema: true, tier: 'strong' } as const;

  private client: GoogleGenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('No Gemini API key — configure one in Settings.');
    }
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model || DEFAULT_GEMINI_MODEL;
  }

  async generateText(req: TextRequest): Promise<string> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: toContents(req),
      config: baseConfig(req),
    });
    return res.text ?? '';
  }

  async generateStream(req: TextRequest): Promise<AsyncIterable<string>> {
    const stream = await this.client.models.generateContentStream({
      model: this.model,
      contents: toContents(req),
      config: baseConfig(req),
    });
    return (async function* () {
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    })();
  }

  async generateJSON(req: JSONRequest): Promise<unknown> {
    const call = () =>
      this.client.models.generateContent({
        model: this.model,
        contents: toContents(req),
        config: {
          ...baseConfig(req),
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(req.schema),
        },
      });

    const first = await call();
    try {
      return parseJsonLoose(first.text ?? '');
    } catch {
      // One retry — schema-constrained output makes this rare but cheap insurance.
      const second = await call();
      return parseJsonLoose(second.text ?? '');
    }
  }

  async webSearch(prompt: string): Promise<SearchResponse> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      // Grounding cannot combine with responseSchema/NO_THINKING config subtleties;
      // keep this call shape minimal.
      config: { tools: [{ googleSearch: {} }], maxOutputTokens: 1200, temperature: 0.3 },
    });

    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources = [];
    for (const c of chunks) {
      const uri = c.web?.uri;
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      sources.push({ title: c.web?.title ?? uri, uri });
      if (sources.length >= 6) break;
    }
    return { text: res.text ?? '', sources };
  }
}
