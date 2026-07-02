import {
  parseJsonLoose,
  type AIProvider,
  type JSONRequest,
  type SearchResponse,
  type TextRequest,
} from './types';
import type { ProviderConfig } from './config';

// One adapter covers Ollama / LM Studio / vLLM / OpenRouter / OpenAI — anything
// speaking the /v1/chat/completions dialect with standard Bearer auth.

interface ChatMessageWire {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function toMessages(req: TextRequest): ChatMessageWire[] {
  const msgs: ChatMessageWire[] = [];
  if (req.system) msgs.push({ role: 'system', content: req.system });
  if (req.messages?.length) {
    for (const m of req.messages) msgs.push({ role: m.role, content: m.content });
  } else {
    msgs.push({ role: 'user', content: req.prompt ?? '' });
  }
  return msgs;
}

export class OpenAICompatProvider implements AIProvider {
  readonly name: string;
  readonly capabilities: { webSearch: boolean; jsonSchema: boolean; tier: 'strong' | 'basic' };

  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
    const host = (() => {
      try {
        return new URL(this.baseUrl).hostname;
      } catch {
        return this.baseUrl;
      }
    })();
    this.name = host === 'localhost' || host === '127.0.0.1' ? `local (${config.model})` : host;
    this.capabilities = { webSearch: false, jsonSchema: false, tier: config.tier };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  private async chat(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, ...body }),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      throw new Error(`Provider request failed (${res.status}): ${text}`);
    }
    return res;
  }

  async generateText(req: TextRequest): Promise<string> {
    const res = await this.chat({
      messages: toMessages(req),
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  async generateStream(req: TextRequest): Promise<AsyncIterable<string>> {
    const res = await this.chat({
      stream: true,
      messages: toMessages(req),
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });
    const body = res.body;
    if (!body) throw new Error('Provider returned no stream body');

    return (async function* () {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames: lines starting with "data: ", separated by newlines.
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const chunk = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore malformed keep-alive frames
          }
        }
      }
    })();
  }

  async generateJSON(req: JSONRequest): Promise<unknown> {
    const base = {
      messages: toMessages(req),
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      temperature: req.temperature ?? 0,
    };

    // Attempt 1: native json_schema enforcement (newer servers).
    try {
      const res = await this.chat({
        ...base,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'output', schema: req.schema, strict: false },
        },
      });
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return parseJsonLoose(data.choices?.[0]?.message?.content ?? '');
    } catch {
      // fall through — server may not support response_format json_schema
    }

    // Attempt 2 (+1 retry): schema in the prompt, loose parsing.
    const guided: TextRequest = {
      ...req,
      system: `${req.system ?? ''}\n\nReturn ONLY valid JSON matching this JSON Schema — no prose, no markdown fences:\n${JSON.stringify(req.schema)}`,
    };
    try {
      return parseJsonLoose(await this.generateText(guided));
    } catch {
      return parseJsonLoose(await this.generateText(guided));
    }
  }

  async webSearch(): Promise<SearchResponse> {
    throw new Error(`Provider "${this.name}" cannot search the web.`);
  }
}
