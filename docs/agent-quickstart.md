# Vantage × AI agents — quickstart

Vantage is a local-first, skill-and-experience-centric career strategy tool. An external agent
(OpenClaw, Claude Code, …) can operate it fully: read the user's evidence base and skill
portfolio, run analyses **with the agent's own model** (no Vantage-side tokens), and write results
back so they appear in the app.

Prerequisite: the Vantage dev server is running — `npm run dev` → `http://localhost:3000`.

## Option A — plain HTTP (zero setup)

Full API reference: `GET http://localhost:3000/llms.txt`. The core loop:

```bash
# 1. Read the portfolio (skills with weighted evidence: 3=core 2=supporting 1=mentioned)
curl -s http://localhost:3000/api/skills

# 2. Fetch an assembled analysis context — NO LLM is called; you get { system, prompt, meta }
curl -s -X POST http://localhost:3000/api/ai/paths \
  -H 'Content-Type: application/json' \
  -d '{"mode":"positioning","contextOnly":true}'
# modes: positioning | adjacent | roadmap (roadmap also needs "target": "...")
# skill-direction analysis: POST /api/ai/skill-analysis {"contextOnly":true}

# 3. Reason over system+prompt with YOUR model, then write the result back
#    (the exact endpoint is also named in meta.writeBack):
curl -s -X POST http://localhost:3000/api/analyses \
  -H 'Content-Type: application/json' \
  -d '{"kind":"positioning","content":"<your markdown analysis>","source":"agent"}'
```

Agent-written results appear on the dashboard/Paths page tagged as agent-sourced.

## Option B — MCP server

```bash
cd <vantage>/mcp && npm install
```

Register with your agent (stdio):

```json
{
  "mcpServers": {
    "vantage": {
      "command": "node",
      "args": ["<absolute path>/vantage/mcp/index.mjs"],
      "env": { "VANTAGE_URL": "http://localhost:3000" }
    }
  }
}
```

12 tools: `list_entries` `get_entry` `create_entry` `update_entry` `list_skills` `curate_skill`
`get_goals` `get_profile` `list_jd_sessions` `get_analysis_context` `save_analysis`
`save_path_plan`.

## Rules every agent must respect

- **The user is the sole authority on their experience.** When creating or updating entries never
  invent facts, metrics, or outcomes, and never upgrade verb strength ("helped" stays "helped" —
  not "led/drove/owned").
- **Reason from skills outward.** Market data (JD digests) is validation signal, not a mold.
- Analyses should reference the user's actual skills and entry titles, distinguish
  "well-evidenced now" vs "needs development", and stay honest about gaps — no flattery.

## Suggested integration test

1. `GET /api/skills` — confirm you can see the portfolio with weighted evidence.
2. Fetch `positioning` context (`contextOnly: true`); confirm `system` and `prompt` are non-empty.
3. Produce the analysis with your own model, following the `system` instructions exactly.
4. `POST /api/analyses` (kind `positioning`, source `agent`).
5. Tell the user to check the dashboard — the analysis should appear with an agent tag.
