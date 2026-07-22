# Vantage — agent development guide

> **Operating Vantage as a guided agent?** If the user wants you to *analyze them* with Vantage
> (not develop the code), follow **[docs/agent-playbook.md](docs/agent-playbook.md)** — the guided
> flow (stories → skills → goals/talents → market research → framework positioning report). This
> file below is for *developing* Vantage.

**Read this file before writing any code.** It is the single source of truth for how this project
is developed, by humans and by AI coding agents (Codex, Claude Code, Cursor, …). It was written by
the AI that built v1 to transfer every judgment call and standard to whoever continues the work.

Deep dives (read when your task touches them):

| Doc | What it holds |
| --- | --- |
| [docs/agent-playbook.md](docs/agent-playbook.md) | **Operating the app for a user** — the guided analysis flow (agent-native front door) |
| [docs/decisions.md](docs/decisions.md) | Why things are the way they are — decision log with "what would change it" |
| [docs/ai-contracts.md](docs/ai-contracts.md) | Per-AI-module contracts, copy-paste prompt constraint blocks, tier playbook |
| [docs/verification.md](docs/verification.md) | Runnable quality gates (exact commands + pass criteria) and release checklist |
| [docs/agent-quickstart.md](docs/agent-quickstart.md) | For agents *operating the app* — MCP/REST quickstart |
| [public/llms.txt](public/llms.txt) | REST API reference — **must stay in sync with routes** |

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product north star (design filter for every feature)

Vantage is a **skill-and-experience-centric positioning & strategy tool** — NOT a job-application
tool. Job applications are one *application* of the core; market data (JDs) is *reference to
validate direction*, never a mold.

Before building anything, ask: **"Does this reason from the user's skills outward, or does it
squeeze the user into a market template?"** Reject or reshape features that do the latter.

Core beliefs the code must express:
- The user's durable asset is their **skill portfolio**, evidenced by real experience entries.
- **The user is the sole authority on their experience.** AI organizes and analyzes; it never
  invents, embellishes, or prescribes.
- **Open & model-autonomous**: users bring their own model (cloud key or local Ollama). The AI
  layer sits behind a provider abstraction and adapts to model capability.

Modules: **Story Bank** (evidence) → **Skill portfolio** (dashboard: extraction, curation,
strength) → **Paths** (positioning / adjacent paths / roadmaps — the strategy core) → **Output**
(JD digest → match → résumé / cover letter, career chat) + **Goals & Values**, **Profile**,
**Settings**, **MCP/agent interface**.

## Commands

```bash
npm run dev        # localhost:3000 (Turbopack)
npm run db:push    # push Drizzle schema to local db.sqlite
npm run db:seed    # load the fictional demo persona (src/lib/demo/persona.json) — REPLACES data
npm run db:studio  # DB browser
npx tsc --noEmit   # typecheck — run after every change
npm run build      # production build — run before committing significant work
# MCP server (agents operating the app):
cd mcp && npm install && VANTAGE_URL=http://localhost:3000 node index.mjs
```

Dev fallback env: `.env.local` → `GEMINI_API_KEY=…` (optional; normal path is in-app /settings).

## Architecture map

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── page.tsx            # Dashboard: radar (RadarPanel), stats, SkillPortfolio, SkillAnalysis, SkillTimeline
│   ├── story-bank/         # evidence entries: list + [entryId] editor (+ AI structure, file attach)
│   ├── goals/  paths/  output/  profile/  settings/
│   └── api/                # entries, skills(+merge), goals, profile, jd-sessions, output,
│                           # cover-letters, path-plans, analyses, settings(+test,+ollama-models), extract,
│                           # ai/{structure,organize,explore,digest→jd-sessions,match,generate,cover-letter,
│                           #     company-research,skill-analysis,paths,extract-skills,import-entries,
│                           #     career-chat,capabilities}
├── components/
│   ├── AppShell.tsx        # sidebar shell + mobile drawer + provider status light
│   ├── ui.ts               # shared class constants (btnPrimary, card, input, …) — USE THESE
│   ├── dashboard/          # RadarChart(pure SVG), RadarPanel(toggle), SkillPortfolio, SkillAnalysis, SkillTimeline
│   ├── story-bank/  goals/  output/
├── lib/
│   ├── constants.ts        # APP_NAME, USER_ID='local'
│   ├── skillScore.ts       # PURE strength math, shared server/client — see "Skill model"
│   ├── db/                 # schema.ts, index.ts(singleton), mappers.ts(JSON boundary), skills.ts(listSkills)
│   ├── ai/                 # one file per AI feature; ALL call getProvider(), never a vendor SDK
│   │   └── provider/       # types.ts(interface+JSONSchema+parseJsonLoose), gemini.ts, openaiCompat.ts,
│   │                       # config.ts(settings read/save + version invalidation), index.ts(factory)
│   └── parsers/            # file.ts (PDF/text extraction), jd.ts (boilerplate stripping)
├── types/index.ts          # canonical domain types
mcp/index.mjs               # MCP stdio server — thin HTTP proxy over the REST API (12 tools)
docs/  public/llms.txt      # documentation (see table above)
```

**Entry granularity (core principle):** an `entry` is a unit of *accomplished work* — a project, a
deliverable, a body of work with a distinct outcome — **divided by accomplishment, NOT by job title
or time period.** One job commonly yields several entries (same `organization`, overlapping dates);
`organization`/dates are context on an accomplishment, not its boundary. This finer granularity is
what makes the evidence→skill links precise, and it's the product's identity — never reshape entries
back toward "one job = one entry." (Enforced in `structure.ts`, `splitResume.ts`, and the guided
playbook.)

Data flow: `entries` (evidence) → AI extraction → `skills` + weighted `entry_skills` links →
`skillScore` → dashboard visuals + Paths context. JD: file/text → digest (computed **once**, stored
on `jd_sessions`) → reused by Matcher and Generator (raw JD text is never re-sent). Analyses and
roadmaps persist (`analyses`, `path_plans`) and render on reload; agent-written ones carry
`source: 'agent'`.

## Hard rules — never violate

### R1. The AI constitution (copy verbatim into any prompt that touches user experience)

- The user is the sole authority on what they did. Never upgrade role, ownership, or impact.
- Preserve verb strength EXACTLY: "helped / supported / contributed to / assisted with" stays —
  never promote to "led / owned / drove / spearheaded / managed / headed / orchestrated".
- Never invent outcomes, metrics, numbers, team sizes, tools, dates, or achievements not in the source.
- If key facts are missing, ask a clarifying question rather than guessing.
- Never imply sole ownership of shared work.
- Analyses reference the user's ACTUAL skills and entry titles; distinguish "well-evidenced now"
  vs "needs development"; be honest about gaps — no flattery.

These are product identity, not style. Full per-module contracts: [docs/ai-contracts.md](docs/ai-contracts.md).

### R2. Provider abstraction

Feature modules **never import a vendor SDK**. Always `getProvider()` from `src/lib/ai/provider`
(`generateText` / `generateStream` → plain-text deltas / `generateJSON(schema)` / `webSearch`).
Check `provider.capabilities` (`webSearch`, `jsonSchema`, `tier`) and degrade gracefully —
web-dependent features fall back to manual input; `tier: 'basic'` gets finer task splitting.
Vendor quirks (Gemini NO_THINKING, schema conversion, SSE parsing) live only inside adapters.

### R3. Privacy & secrets

- API keys live only in local SQLite (`settings`) or `.env.local` — both gitignored. API responses
  mask keys (`maskKey`). Never log or commit a key.
- The user's real data (`db.sqlite`) never enters the repo, screenshots, or README. Public assets
  use a fictional demo persona (procedure in [docs/verification.md](docs/verification.md)).

### R4. Sync duties

Changing any API route ⇒ update `public/llms.txt` AND `mcp/index.mjs` in the same commit.
Changing schema ⇒ `npm run db:push` + update `src/types/index.ts` + `src/lib/db/mappers.ts`.

### R5. Data boundaries

JSON-encoded columns (`keyHighlights`, `tags`, `digest`, `selectedEntryIds`, `links`,
`providerConfig`) are parsed/serialized **only** at the API boundary via `src/lib/db/mappers.ts`.
`rawNotes` is the user's unedited input — AI output goes to `refinedNarrative`, never overwrites it.

## Conventions

- **Next.js 16**: route/page `params` are async — `const { id } = await ctx.params` with
  `RouteContext<'/api/entries/[id]'>`; pages take `params: Promise<…>`. Streams are returned as
  `new Response(readableStream, { headers })`.
- **Streaming** is plain UTF-8 text chunks, NOT SSE: server `textStreamToResponse`
  (`src/lib/ai/stream.ts`), client `readTextStream` (`src/lib/ai/readStream.ts`).
- **UI**: no component library, no chart library. Reuse class constants from
  `src/components/ui.ts`; visualizations are hand-written SVG (see `RadarChart`, `SkillTimeline`).
  Single brand accent `var(--accent)` (indigo) for primary CTAs / active nav / data viz; neutrals
  for everything else. Design tokens in `globals.css`; light+dark both required.
- **DB**: better-sqlite3 sync API (`.all()/.get()/.run()`), schema kept Postgres-compatible.
  Single user: `USER_ID = 'local'` keys the one-row tables (goals_document, profile, settings).
- **Language**: repo, docs, UI copy in English.

## Skill model semantics (do not change casually — see docs/decisions.md D3–D4)

- `entry_skills.weight` is an **ownership-depth ladder** (1–4): 4 = led/architected at scale,
  3 = owned core, 2 = contributed, 1 = used. NOT a "how many times mentioned" count.
- Strength 0–100 (`src/lib/skillScore.ts`, pure) is **depth-first and hard to saturate**: the
  DEEPEST evidence anchors a base (w1→12, w2→26, w3→46, w4→64); further evidence corroborates with
  strong diminishing returns (cap +24). Then × recency (<1y ×1.0, 1–3y ×0.85, >3y ×0.7, undated
  ×0.9) + span bonus (+2/yr, cap +10). Levels at 10/25/45/70 → Lv.1–5. **The top band is reserved
  for genuine ownership depth (w3–4) — you cannot reach it by piling up shallow mentions.**
  **No entry-type weighting by design** (all evidence counts).
- Re-extraction (`/api/ai/extract-skills`) upserts by case-insensitive name: user curation
  (id, name casing, category) survives; evidence links are refreshed; zero-evidence skills dropped.

## Agent interface (context mode)

`/api/ai/paths` and `/api/ai/skill-analysis` accept `contextOnly: true` → `{ system, prompt, meta }`
with no LLM call; external agents reason with their own model and write back via
`POST /api/analyses` (`source: 'agent'`) or `POST /api/path-plans`. Keep every AI feature's SYSTEM
constant and context builder **separated** so contextOnly stays nearly free to support.

## Definition of done

1. `npx tsc --noEmit` clean; `npm run build` clean for significant changes.
2. The relevant gates in [docs/verification.md](docs/verification.md) pass — especially **G1
   (verb fidelity)** for any prompt change and **G4 (curation survival)** for extraction changes.
3. Verified against real behavior (curl the endpoint / load the page), not just compilation.
4. Sync duties (R4) done. Docs updated if behavior they describe changed.
