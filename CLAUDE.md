@AGENTS.md

# Vantage — project spec (authoritative)

## Product north star (read this before designing anything)

Vantage is a **skill-and-experience-centric positioning & strategy tool** for individuals in a
fast-changing job landscape — NOT a job-application tool. Job applications are one *application* of
the core; market data (JDs, openings) is *reference input to validate direction*, never a mold to
squeeze the user into.

Core beliefs the design must express:
- A person's most durable asset is their **unique skill portfolio**, evidenced by real experience.
  The product's center of gravity is: organize experiences → extract/curate the skill portfolio →
  consciously shape it.
- **From skills outward, not from jobs inward.** Given a target (or none), the tool reasons about:
  (a) adjacent paths reachable with a similar skill composition, and (b) skill-building routes —
  what's missing, in what order to build it, and what evidence would prove it.
- The user is the sole authority on their experience (verb fidelity, no invention — see AI
  constraints below). AI explores and analyzes; it never prescribes or flatters.
- **Open-source & model-autonomous** (target): users choose a local open-source model (e.g. Ollama)
  or bring their own LLM API key. The AI layer must sit behind a provider abstraction, and harness
  design must adapt to model capability — weaker models get finer task splitting, stricter
  structured-output validation and retries, and graceful feature degradation (e.g. web-grounded
  research is provider-optional).

Current modules (implementation): **Story Bank** (experience evidence), **Goals & Values**
(direction), **Dashboard** (skill portfolio: first-class skills with evidence links, curation, AI
analysis), **Paths** (positioning / adjacent paths / skill-building roadmaps — the strategy core),
**Output** (JD digest → match → résumé / cover letter, career chat — one *application* of the
profile).

## Tech stack (as built)

- **Next.js 16** (App Router) + **React 19**, TypeScript, Tailwind v4 (`@import "tailwindcss"` in
  `globals.css`, no `tailwind.config.js`). No component library — minimal Tailwind utilities.
- **SQLite + Drizzle ORM** (`better-sqlite3`). Schema kept Postgres-compatible.
- **User-selectable AI provider** via `/settings` (stored in the local `settings` table; keys never
  leave the machine, API responses mask them). Adapters: `gemini` (@google/genai; webSearch-capable)
  and `openai-compat` (fetch-based `/v1/chat/completions` + Bearer — covers Ollama / LM Studio /
  vLLM / OpenRouter / OpenAI). Per-provider settings are merge-saved so switching never loses keys.
  Dev fallback: `GEMINI_API_KEY` env. Saving settings bumps a config version that invalidates the
  provider singleton (`provider/config.ts`).
- **Tier-adaptive harness:** `capabilities.tier: 'basic'` (small local models) → finer task
  splitting (e.g. `splitResume` chunks the document), JSON prompt-guidance fallback + loose parsing
  + retry. Web-dependent features (company research, live market data) are `webSearch`-gated and
  degrade to manual input.
- **Gemini gotcha:** 2.5 models "think" by default, consuming output tokens. Disabled via
  `NO_THINKING` in `provider/gemini.ts`. Streaming uses plain-text chunks
  (`textStreamToResponse` / `readTextStream`), not SSE.
- **`pdf-parse` v2** for JD PDFs; plain-text paste fallback.
- No auth: `USER_ID = 'local'` (`src/lib/constants.ts`).

### Next.js 16 conventions (differ from older training data)

- Route handler / page `params` are **async**: `async function GET(req, ctx: RouteContext<'/api/entries/[id]'>) { const { id } = await ctx.params }`.
  Pages: `params: Promise<{ entryId: string }>` then `await params`.
- Route handlers are not cached for non-GET; DB-reading GETs are dynamic automatically.
- Stream by returning `new Response(readableStream, { headers })`.

## Data models

See `src/types/index.ts` for the canonical TypeScript. DB tables (`src/lib/db/schema.ts`):
`entries`, `goals_document` (one row, id = USER_ID), `profile` (one row, id = USER_ID),
`jd_sessions`, `resume_outputs`, `cover_letters`, `skills` + `entry_skills` (first-class skill
portfolio; links carry `weight` 1–3 = mentioned/supporting/core; categories: technical | tool |
domain | soft), `path_plans` (saved roadmaps), `analyses` (persisted analyses; kind: skill |
positioning | adjacent; source: app | agent), `settings` (one row; providerConfig JSON with
per-provider sections).
JSON-encoded columns: `keyHighlights`, `tags`, `digest`, `selectedEntryIds`, `links`,
`providerConfig` — parse/serialize at the API boundary.

**Skill strength** (`src/lib/skillScore.ts`, pure, shared server/client): score 0–100 =
Σ(evidence weights)×12 × recency factor (<1y ×1.0, 1–3y ×0.85, >3y ×0.7, undated ×0.9) + span
bonus (+2/yr, cap +10). `levelOf`: Lv.1–5 at 10/25/45/70. Dashboard radar/levels and the Paths
context both consume this.

## Skills & Paths (the strategy core)

- `lib/ai/extractSkills.ts` → `/api/ai/extract-skills`: extracts the portfolio from all entries,
  upserts by case-insensitive name (user curation — id, name casing, category — survives
  re-extraction; evidence links are refreshed). Skills with zero evidence are dropped.
- `lib/db/skills.ts` `listSkills()`: skills + entryIds, strongest evidence first.
- Curation API: PATCH/DELETE `/api/skills/[id]`, POST `/api/skills/merge` { fromId, toId }.
- `lib/ai/paths.ts` → `/api/ai/paths` { mode: positioning | adjacent | roadmap, target?,
  jdSessionId?, useWebSearch? } (streaming). Shared context = skill portfolio (with evidence) +
  entries + goals. Market data (JD digest, `marketResearch()` web search) is injected as
  *reference*, prompts insist skills-first. Roadmaps saveable via `/api/path-plans`.
- `GET /api/ai/capabilities` lets the UI adapt (web-search toggles disable when the provider can't).

## Agent interface (MCP + context mode)

External agents (Claude Code, OpenClaw, …) can operate the app and do the analysis with THEIR own
model — no Vantage-side tokens:
- **context mode**: `/api/ai/paths` and `/api/ai/skill-analysis` accept `contextOnly: true` →
  `{ system, prompt, meta }` (no LLM call). `meta.writeBack` names the write-back endpoint.
- **Write-back**: `POST /api/analyses` (source: 'agent' — shown on dashboard with an agent tag),
  `POST /api/path-plans`.
- **MCP server**: `mcp/index.mjs` (stdio, own package.json; `VANTAGE_URL` env). 12 tools proxying
  the HTTP API. REST reference for non-MCP agents: `public/llms.txt` — keep it in sync when
  changing API routes.

## AI modules (`src/lib/ai/`)

- **Provider abstraction (`provider/`)** — ALL feature modules call `getProvider()`
  (`generateText` / `generateStream` → text deltas / `generateJSON(schema)` / `webSearch`), never a
  vendor SDK. Neutral JSON-schema subset in `provider/types.ts`; Gemini adapter in
  `provider/gemini.ts` (holds NO_THINKING + Type conversion). `AI_PROVIDER` env selects the adapter
  (default `gemini`; `openai-compat` for Ollama/local models is planned). Check
  `provider.capabilities` (`webSearch`, `jsonSchema`, `tier`) and degrade gracefully — company
  research is webSearch-gated. Streaming routes use `textStreamToResponse` (`stream.ts`).
- `structure.ts` — raw notes → one structured entry (title/type/org/dates/narrative/highlights/tags), JSON schema.
- `splitResume.ts` — a whole résumé/doc → many structured entries (bulk import).
- `organize`/`explore` — streaming narrative / goals exploration.
- `digest`/`match` — JD → digest (once) → scored entry matches (JSON).
- `generate.ts` — résumé body; entries routed by type into Experience / Projects / Education; grouped skills. Contact header is built deterministically from `profile` in `ResumePreview` (AI never sees contact info).
- `coverLetter.ts` + `company.ts` — cover letter (streaming) + company research via Gemini `googleSearch` grounding (returns prose + source links; grounding cannot combine with JSON schema).
- `skillAnalysis.ts` — dashboard skill clusters / strengths / gaps / directions, grounded in entries + goals.
- File upload: `parsers/file.ts` extracts PDF/text; `/api/extract` (append to one entry) and `/api/ai/import-entries` (split to many).

All AI behavior keeps the verb-fidelity / no-invention constraints. Verified gates: organize, generate, structure, split, cover letter all preserve modest verbs and invent nothing.

## JD pipeline (digest computed once, reused)

`JD file → Digest AI → JDDigest (stored on JDSession)`. Both **Matcher** (digest + compact entries)
and **Generator** (digest + selected full entries) consume the stored digest — the raw JD text is
never re-sent to those calls.

## AI behavior — non-negotiable system-prompt constraints

**Story Organizer (`lib/ai/organize.ts`) & Résumé Generator (`lib/ai/generate.ts`):**
- The user is the sole authority on what they did. Never upgrade role, ownership, or impact.
- Preserve verb strength exactly: "helped / supported / contributed to / assisted with" stays — never
  promote to "led / owned / drove / spearheaded / managed".
- Never invent outcomes, metrics, team sizes, or achievements not in the source.
- If key facts are missing, ask a clarifying question rather than guessing.
- Never imply sole ownership of shared work.

**Goals Explorer (`lib/ai/explore.ts`):** exploration-first, non-prescriptive. If a field is sparse
(< ~80–100 words): open with 2–3 questions before analyzing. If substantive: possibility analysis.
Surface value tensions without resolving. Name books/frameworks only if confident they exist.

**Digest (`lib/ai/digest.ts`):** JSON only, no fences/prose, max_tokens ~600. Conservative — only what
is explicitly stated. keywords = technical skills/tools only (no soft skills). required vs niceToHave
by signal words (required/must/minimum vs preferred/bonus/nice-to-have/plus).

**Matcher (`lib/ai/match.ts`):** JSON only. Score each entry 0–10 vs digest. Include all entries with
score ≥ 4, sorted descending. Each match: rationale + optional framingNote. Plus a `gaps` list.

**Career Chat (`api/ai/career-chat`):** inject entry summaries (title/type/org/dates/highlights/tags —
not full narratives) + full GoalsDocument. Reference specific entries by name; distinguish
"well-evidenced now" vs "needs development". Drop oldest message pairs past 10 exchanges.

## File structure

`src/app/{page,layout}.tsx`, `src/app/{story-bank,goals,output}/...`, `src/app/api/...`,
`src/components/{story-bank,goals,output}/...`, `src/lib/{db,ai,parsers}`, `src/types/index.ts`,
`src/lib/constants.ts`.

## Dev commands

```bash
npm run dev        # localhost:3000
npm run db:push    # push schema to db.sqlite
npm run db:studio  # Drizzle Studio
```

`.env.local` (manual, gitignored): `GEMINI_API_KEY=...`
