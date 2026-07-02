// Provider-neutral AI interface. All feature modules (organize, digest, match, …)
// talk to an AIProvider — never to a vendor SDK directly. This is what lets users
// choose a local open-source model or bring their own API key.

export interface AICapabilities {
  /** Provider can do live web search with source attribution (e.g. Gemini grounding). */
  webSearch: boolean;
  /** Provider natively enforces a JSON schema on output. Without it we rely on
   * prompt + loose parsing + retry. */
  jsonSchema: boolean;
  /** Harness adaptation knob: 'basic' models get finer task splitting, stricter
   * validation/retries, and shorter prompts where features support it. */
  tier: 'strong' | 'basic';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TextRequest {
  system?: string;
  /** Single-turn prompt. Provide either this or `messages`. */
  prompt?: string;
  /** Multi-turn history (career chat). Last message must be from the user. */
  messages?: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

// Minimal neutral JSON-schema subset — enough for our structured outputs, and
// mechanically convertible to vendor formats (Gemini Type schema, OpenAI json_schema).
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  /** Gemini-specific ordering hint; harmless elsewhere. */
  propertyOrdering?: string[];
}

export interface JSONRequest extends TextRequest {
  schema: JSONSchema;
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface SearchResponse {
  text: string;
  sources: SearchSource[];
}

export interface AIProvider {
  readonly name: string;
  readonly capabilities: AICapabilities;
  generateText(req: TextRequest): Promise<string>;
  /** Yields plain text deltas. */
  generateStream(req: TextRequest): Promise<AsyncIterable<string>>;
  /** Returns parsed JSON (callers validate/coerce fields). Implementations should
   * parse loosely (strip fences) and retry once before giving up. */
  generateJSON(req: JSONRequest): Promise<unknown>;
  /** Only valid when capabilities.webSearch — callers must check and degrade. */
  webSearch(prompt: string): Promise<SearchResponse>;
}

/** Strip markdown fences / surrounding prose and parse the first JSON value found. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to extraction
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }
  const start = trimmed.search(/[{[]/);
  if (start !== -1) {
    const open = trimmed[start];
    const close = open === '{' ? '}' : ']';
    const end = trimmed.lastIndexOf(close);
    if (end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)); // let this throw
    }
  }
  throw new Error('No JSON found in model output');
}
