# Decision log

The judgment calls behind Vantage's design, recorded so future contributors (human or AI) inherit
the *reasoning*, not just the code. Each entry: what was decided, why, how to apply it when
building, and what evidence would justify revisiting it. Don't silently reverse these — if you
believe one is wrong, say so explicitly and update this file in the same change.

---

## D1. Skills-first is the design filter

**Decision:** Every feature must reason *from the user's skill portfolio outward*. Job listings,
JD digests, and market research enter the system only as *reference data to validate direction*.

**Why:** The product's founding belief: in a fast-changing market, a person's durable asset is
their unique skill composition, not their fit to today's openings. Tools that start from job
listings train users to contort themselves into templates.

**How to apply:** When specifying a feature, write the prompt/UI so the portfolio is the subject
and the market is a modifier ("given YOUR composition, this JD suggests…"), never the reverse.
The Paths prompts (`src/lib/ai/paths.ts`) are the canonical example — copy their stance.

**What would change it:** Nothing anticipated; this is identity, not a tradeoff.

## D2. The AI constitution is non-negotiable product identity

**Decision:** Verb fidelity, no invention, no sole-ownership claims, honesty-over-flattery — in
every prompt that touches the user's experience (see AGENTS.md R1).

**Why:** A career tool that quietly inflates its user is worse than useless: it produces claims
the user can't defend in an interview and erodes the evidence-based positioning the whole product
stands on. This was validated with a gate test from day one (docs/verification.md G1).

**How to apply:** Copy the constraint block from docs/ai-contracts.md into new prompts verbatim.
Run G1 after any prompt edit. Weaker local models paraphrase more (llama3.2 rewrote "helped"
without upgrading it) — acceptable floor is *no upgrade*; exact-verb preservation is the target.

**What would change it:** Nothing. If a model can't hold the constraint, gate features by tier
instead of weakening the constraint.

## D3. Skill strength = weighted evidence × recency + span (0–100)

**Decision:** `Σ(link weights)×12 × recency factor + span bonus`, capped 100; levels at
10/25/45/70. Link weight 3/2/1 = core/supporting/mentioned, rated per evidence link by the
extraction AI. Implemented once, purely, in `src/lib/skillScore.ts` (shared server/client).

**Why:** Raw evidence-count had no resolution (everything scored 1–2). Weighting *how central* a
skill was to each entry, decaying stale evidence, and rewarding sustained use produced a spread of
~16 distinct scores across a real 26-skill portfolio — enough to rank and radar meaningfully
without pretending to more precision than the data has.

**How to apply:** Never fork the formula into components — always import `strengthOf`/`levelOf`.
UI copy should describe strength as "weighted evidence × recency", not as objective skill level.

**What would change it:** User feedback that scores feel wrong in a *systematic* direction (e.g.
recency decay too harsh for foundational skills). Tune constants in one place; update this entry.

## D4. No entry-type weighting in scores — deliberately

**Decision:** A project or activity entry counts exactly like a work entry in strength math.

**Why:** Product belief: evidence is evidence. Self-driven projects and teaching are often the
*most* distinctive evidence a person has; penalizing them re-imports the credentialism the tool
exists to escape. The evidence *type* is still visible to the user (portfolio detail) and to the
AI (analysis context includes entry types) — judgment about type is delegated to the reader, not
hard-coded into the score.

**What would change it:** Strong evidence users are misled (e.g. a hobby mention outranking a
5-year specialty in ways curation can't fix). Prefer exposing a user-tunable knob over a silent
default.

## D5. Re-extraction preserves user curation

**Decision:** `/api/ai/extract-skills` upserts by case-insensitive name. Existing skills keep
their id, name casing, and category; evidence links are refreshed from the new extraction;
zero-evidence skills are dropped; user renames/merges/deletions are never resurrected by the AI.

**Why:** The portfolio is the user's asset that they *consciously shape* — if a re-run steamrolled
their curation, curation would be pointless and trust would die. Verified by gate G4.

**How to apply:** Any new AI write-path into user-curated data must follow the same pattern:
AI proposes, matches against existing by stable key, never overwrites user-authored fields.

## D6. JD digest computed once, reused everywhere

**Decision:** JD upload → digest (structured JSON) stored on `jd_sessions`. Matcher and Generator
consume the digest; the raw JD text is never re-sent to an LLM.

**Why:** Token economy (digest ≈ 300 tokens vs 1–3k raw), determinism (both consumers see the same
interpretation), and a natural place for the user to verify what the system understood.

## D7. Provider abstraction with capability flags; adapt to weak models, don't reject them

**Decision:** One `AIProvider` interface (`src/lib/ai/provider/types.ts`); adapters for Gemini and
OpenAI-compatible endpoints (covers Ollama/LM Studio/vLLM/OpenRouter/OpenAI). Capabilities
`{ webSearch, jsonSchema, tier }` gate features: no webSearch → research features degrade to
manual input; `tier: 'basic'` → finer task splitting (`splitResume` chunks documents), JSON
fallback chain (native schema → prompt-guided + `parseJsonLoose` → one retry).

**Why:** Open-source, model-autonomous is a founding goal. Users on 8B local models deserve a
working product with honest degradation, not a broken one or a cloud lock-in.

**How to apply:** New AI feature? Ask which capabilities it needs, declare the degradation path in
the UI (disabled toggle + tooltip, like the web-search checkboxes), and consider a `basic`-tier
variant if the task is large or schema-heavy.

**What would change it:** New capability axes (vision, long context) — extend the flags, same pattern.

## D8. Per-provider settings are merge-saved; keys never leave the machine

**Decision:** `settings.providerConfig` stores each provider's config in its own section
(`gemini`, `openaiCompat`) plus `active`. Switching providers never erases the other's key. Keys
are stored only in local SQLite, masked in every API response, with `GEMINI_API_KEY` env as dev
fallback. Saving bumps a config version that invalidates the provider singleton (no restart).

**Why:** The single-slot design shipped first had a real bug: switch away and back lost the key.
Local-first key storage is the privacy contract of the product.

## D9. Agent interface = context mode + write-back, MCP as a thin HTTP proxy

**Decision:** Analysis endpoints accept `contextOnly: true` → `{ system, prompt, meta }` with no
LLM call; agents reason with their own model and write back (`/api/analyses` with
`source: 'agent'`, `/api/path-plans`). The MCP server (`mcp/index.mjs`) is a stdio proxy over the
REST API — it never touches the DB directly.

**Why:** Users with an assistant (OpenClaw, Claude Code) shouldn't spend Vantage-side tokens; the
app supplies data + framing, the agent supplies intelligence. Proxying over HTTP keeps one code
path for validation/invariants; agent-sourced results are labeled in the UI for provenance.

**How to apply:** Keep SYSTEM constants and context builders separated in every AI module
(`buildX()` + `xStream()` pattern) so contextOnly support stays ~free. New analysis kinds must
render their persisted results somewhere in the UI — a write-back endpoint that displays nowhere
is a broken promise (this bug shipped once and was fixed for positioning/adjacent).

## D10. Streaming is plain text chunks, not SSE

**Decision:** Server emits raw UTF-8 deltas (`textStreamToResponse`); client accumulates with
`readTextStream`. No SSE framing.

**Why:** SSE adds framing/parsing complexity for zero benefit here — one consumer, one stream, no
event multiplexing. Plain chunks work identically across providers after adapter normalization.

## D11. Minimal UI: no component/chart libraries, one accent color, hand-written SVG

**Decision:** Tailwind utilities + shared class constants (`src/components/ui.ts`); design tokens
in `globals.css`; indigo `--accent` reserved for primary actions / active nav / data viz; radar,
timeline, and score bars are hand-written SVG. Radar has two lenses (top skills / category balance).

**Why:** User chose "minimal, productized". Dependencies are a maintenance tax for an open-source
single-user app; the visualizations needed are simple enough that owned SVG beats a chart lib on
size, theming, and control. Info-display-first, game-style-second for the dashboard.

**What would change it:** A visualization genuinely beyond hand-rolling (force graphs, 3D). Add
the smallest dedicated lib then, not before.

## D12. Public assets use a fictional demo persona, never real data

**Decision:** README screenshots and any shareable asset are captured from a seeded fictional
profile ("Riley Park"), via: back up `db.sqlite` → seed demo → **restart dev server** → capture →
restore backup → **restart again** (the server holds the old file inode; without restart it serves
stale data). Procedure commands in docs/verification.md.

**Why:** The user's career history is personal data; the repo is public.

## D13. SQLite via better-sqlite3, schema kept Postgres-compatible

**Decision:** Synchronous better-sqlite3 (`.all()/.get()/.run()`), no ORM async layer; column
types and defaults chosen to port to Postgres if the project ever grows a hosted mode. Single-user
rows keyed by `USER_ID = 'local'`.

**Why:** Local-first, zero-setup, fast; sync API keeps route handlers simple. Postgres
compatibility is cheap insurance, not a commitment.

## D14. Framework grounding — validate on real people before building UI

**Decision:** The freeform Paths analyses lack a methodological spine — they produce conclusions,
not reusable lenses. Direction: ground analysis in named, time-tested career frameworks, starting
with **value-chain positioning** and the **ability core** (knowledge–skills–strengths) triad
(`src/lib/ai/frameworks.ts`, modes `value-chain` / `ability-core` on `/api/ai/paths`). BUT no
product UI is built until the frameworks pass live validation on 3–5 real subjects under the
pre-registered protocol in docs/validation-protocol.md.

**Why:** Honest reassessment (after zero organic traction) concluded: the evidence data layer is
real differentiation; the analysis layer was "AI freestyle guided by good prompts" — plausible
output, but users learn no transferable mental model, and it under-answers "why not just ChatGPT".
Framework × personal evidence base × persistent artifact is the defensible combination. Validation
comes first because the project has exactly one validated user so far — building more UI on an
unvalidated hypothesis is how the 自嗨 risk compounds.

**Primary sources / IP boundary:** each framework is attributed to its origin — value chain from
Michael E. Porter, *Competitive Advantage* (1985); the Knowledge/Skills/Abilities decomposition from
occupational-psychology job analysis; "talent = recurring patterns of thought, feeling, and
behavior" from Marcus Buckingham & Donald O. Clifton, *Now, Discover Your Strengths* (2001);
vocational interests (used by the assessment module) from John L. Holland, *Making Vocational
Choices* (1973), with public-domain items from the U.S. DoL O*NET Interest Profiler. Cite primaries,
never a secondary course; neutral English names in code and UI; no third-party course content.

**How to apply:** run the protocol; record results in `validation/results.md`. If validation
passes, the UI should be a guided stepwise calibration producing persistent artifacts — not
another streaming text box. The strengths layer must always be phrased as hypotheses citing
cross-entry patterns.

**What would change it:** the validation result itself — that's the point. Subjects' verbatim
"fortune-telling" complaints are the highest-value signal for prompt revision.

## D15. Agent-native guided flow is the product form (and the distribution answer)

**Decision:** Vantage ships as a **fork-and-run, agent-native** tool. The user forks the repo and
tells their own coding agent (Claude Code / Codex) to "analyze me"; the agent reads the guided
playbook (`docs/agent-playbook.md`, surfaced via `AGENTS.md` and a Claude Code skill) and walks the
flow — experiences → skills → goals/talents → aggregate market research → positioning report —
writing everything through the same REST/MCP API the UI uses, so UI and agent share one dataset.
The agent interface is **REST-first** (call the API per `llms.txt`, zero MCP setup; MCP is an
optional upgrade). Résumé generation stays UI-only, bound to a specific target JD the user actually
intends to apply to.

**Why:** This resolves the distribution question without hosting. Every hosted option (multi-tenant
web app, Drive-as-backend, browser extension) means holding other people's career data and/or a
rewrite; a desktop build is heavier. Fork-and-run keeps **single instance = single user forever**
(`USER_ID = 'local'` is final, never a transition to multi-user), zero data liability, and matches
the open-source / local-first / model-autonomous identity. It is also the cheapest validation
vehicle: hand the repo to a friend with Claude Code.

**Assessment IP boundary:** the talents/interests step uses a **pluggable** assessment
(`src/lib/assessments/`) whose default is a public-domain instrument (Holland RIASEC via O*NET);
swapping in a custom questionnaire is a JSON drop-in. Never ship a trademarked instrument's items.

**How to apply:** any new capability should be reachable BOTH from the UI and from the agent (add
the REST route + a thin MCP proxy + a line in `llms.txt` and the playbook). Keep SYSTEM constants
and context builders separated so `contextOnly` stays free (see D9).

**What would change it:** if fork-and-run friction proves too high for non-technical users, a
desktop (Electron) build is the pre-considered next step — still local, still single-user, no
hosting.
