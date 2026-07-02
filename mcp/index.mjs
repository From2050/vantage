#!/usr/bin/env node
// Vantage MCP server — lets any MCP-capable agent (Claude Code, OpenClaw, …)
// operate the running Vantage app: read the skill portfolio and evidence,
// fetch assembled analysis contexts (so the AGENT's own model does the
// reasoning — no Vantage tokens spent), and write results back.
//
// Usage: VANTAGE_URL=http://localhost:3000 node index.mjs   (stdio transport)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.VANTAGE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vantage API ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: 'vantage', version: '0.1.0' });

// ---- Read: evidence base ----

server.tool(
  'list_entries',
  'List all experience entries (the evidence base): id, title, type, organization, dates, tags, highlights.',
  {},
  async () => {
    const entries = await api('/api/entries');
    return asText(
      entries.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        organization: e.organization,
        dateFrom: e.dateFrom,
        dateTo: e.dateTo,
        tags: e.tags,
        keyHighlights: e.keyHighlights,
      })),
    );
  },
);

server.tool(
  'get_entry',
  'Get one entry in full, including raw notes and refined narrative.',
  { id: z.string() },
  async ({ id }) => asText(await api(`/api/entries/${id}`)),
);

server.tool(
  'create_entry',
  'Create a new experience entry. The user is the sole authority on their experience — never invent or upgrade facts. Dates optional ("YYYY" or "YYYY-MM"; dateTo may be "present").',
  {
    title: z.string(),
    type: z.enum(['work', 'education', 'project', 'activity']),
    organization: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    rawNotes: z.string().optional(),
    refinedNarrative: z.string().optional(),
    keyHighlights: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  },
  async (fields) => asText(await api('/api/entries', { method: 'POST', body: JSON.stringify(fields) })),
);

server.tool(
  'update_entry',
  'Update fields of an existing entry (partial patch).',
  {
    id: z.string(),
    title: z.string().optional(),
    type: z.enum(['work', 'education', 'project', 'activity']).optional(),
    organization: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    rawNotes: z.string().optional(),
    refinedNarrative: z.string().optional(),
    keyHighlights: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ id, ...fields }) =>
    asText(await api(`/api/entries/${id}`, { method: 'PATCH', body: JSON.stringify(fields) })),
);

// ---- Read: skill portfolio, goals, profile, market data ----

server.tool(
  'list_skills',
  'The curated skill portfolio: name, category (technical|tool|domain|soft), weighted evidence links (weight 3=core, 2=supporting, 1=mentioned).',
  {},
  async () => asText(await api('/api/skills')),
);

server.tool(
  'curate_skill',
  'Rename or recategorize a skill in the portfolio.',
  {
    id: z.string(),
    name: z.string().optional(),
    category: z.enum(['technical', 'tool', 'domain', 'soft']).optional(),
  },
  async ({ id, ...fields }) =>
    asText(await api(`/api/skills/${id}`, { method: 'PATCH', body: JSON.stringify(fields) })),
);

server.tool('get_goals', "The user's goals & values document (vision / limits / identity).", {}, async () =>
  asText(await api('/api/goals')),
);

server.tool('get_profile', 'Contact/profile info used in résumé headers.', {}, async () =>
  asText(await api('/api/profile')),
);

server.tool(
  'list_jd_sessions',
  'Uploaded job descriptions with their structured digests (market reference data).',
  {},
  async () => {
    const sessions = await api('/api/jd-sessions');
    return asText(sessions.map((s) => ({ id: s.id, filename: s.filename, digest: s.digest })));
  },
);

// ---- The core agent flow: get context → reason with YOUR model → write back ----

server.tool(
  'get_analysis_context',
  'Fetch a fully-assembled analysis context (system + prompt) WITHOUT calling any LLM. Modes: "skill" (skill-direction analysis), "positioning" (where the portfolio stands), "adjacent" (paths reachable with a similar composition), "roadmap" (skill-building plan toward target — requires target). Reason over it with your own model, then write the result back using the endpoint named in meta.writeBack (or save_analysis / save_path_plan).',
  {
    mode: z.enum(['skill', 'positioning', 'adjacent', 'roadmap']),
    target: z.string().optional(),
    jdSessionId: z.string().optional(),
  },
  async ({ mode, target, jdSessionId }) => {
    if (mode === 'skill') {
      return asText(await api('/api/ai/skill-analysis', { method: 'POST', body: JSON.stringify({ contextOnly: true }) }));
    }
    return asText(
      await api('/api/ai/paths', {
        method: 'POST',
        body: JSON.stringify({ mode, target, jdSessionId, contextOnly: true }),
      }),
    );
  },
);

server.tool(
  'save_analysis',
  'Write an analysis result back to Vantage (appears on the dashboard, marked as agent-sourced). kind: skill | positioning | adjacent.',
  { kind: z.enum(['skill', 'positioning', 'adjacent']), content: z.string() },
  async ({ kind, content }) =>
    asText(
      await api('/api/analyses', {
        method: 'POST',
        body: JSON.stringify({ kind, content, source: 'agent' }),
      }),
    ),
);

server.tool(
  'save_path_plan',
  'Save a skill-building roadmap (appears in the Paths page).',
  { targetRole: z.string(), content: z.string() },
  async ({ targetRole, content }) =>
    asText(await api('/api/path-plans', { method: 'POST', body: JSON.stringify({ targetRole, content }) })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
