# Vantage — guided analysis playbook (for AI agents)

You are an AI assistant (Claude Code, Codex, …) and your user wants you to **analyze them with
Vantage**. This document is your script. Vantage is a local, single-user career-strategy tool: the
user's evidence (experiences) → skill portfolio → framework positioning report. You do the reasoning
with **your own model**; Vantage stores the structured data and renders it in a UI. Everything the
user's data touches stays on their machine.

## Golden rules (non-negotiable — these are the product's identity)

1. **The user is the sole authority on their experience.** Never invent, embellish, or upgrade
   facts. Preserve verb strength exactly — "helped / supported / contributed to" must never become
   "led / owned / drove / spearheaded / managed". Never imply sole ownership of shared work.
2. **Reason from the user's skills outward.** Market data (JDs, research) is reference to validate
   direction, never a mold to squeeze them into.
3. **Offer choice at every step.** For each phase, ask whether they want to: **(a) do it here in
   chat with you**, **(b) fill it themselves in the UI**, or **(c) hand you an existing document**.
   Any step is skippable.
4. **Write through the API so the UI and you share one dataset.** Never keep the analysis only in
   chat — persist it, so the user can see, edit, and revisit it in the app.

## Setup

- Ensure the app is running: `npm run dev` (default http://localhost:3000). If it isn't, tell the
  user to start it. Set `BASE` to that URL.
- Prefer the **MCP server** if the user has it configured (tools named `list_entries`, `create_entry`,
  `set_goals`, `get_analysis_context`, …). Otherwise use plain **REST** per `public/llms.txt` — no
  setup required; just `curl`/`fetch` `BASE`.
- **Model note to relay to the user:** organizing messy stories is cheap work — they can point
  Vantage at a **local (Ollama) or cheap model in /settings** for it, and keep a stronger model for
  the analysis. Vantage's own AI features use whatever provider is set there; YOUR reasoning uses
  your own model.
- Read `GET /api/status` first → `{ entries, skills, jdCount, goalsSet, profileSet, analyses }`.
  Use it to resume where the user left off instead of starting over.

## The flow

### 1 · Stories (the evidence base — one entry per ACCOMPLISHMENT, not per job)
**The unit of an entry is a coherent piece of accomplished work** — a project, a deliverable, a body
of work with a distinct outcome — **NOT a job title or a block of time.** This is the heart of
Vantage: skills are extracted from *what was accomplished*, so the boundary must be the
accomplishment. Organization and dates are *context on* an accomplishment (which job, when), never
the thing that defines it.

- **A single job usually becomes several entries.** If a role spanned multiple distinct bodies of
  work (e.g. "UX720V6 respin RTL", "post-silicon bring-up", "Linux bring-up", "edge-AI accelerator",
  "IMU driver + EIS"), make **each one its own entry** — same organization and overlapping dates are
  fine and expected. **Do NOT ask the user to choose "split by job vs. merge into one" — that is the
  wrong axis.** Splitting by accomplishment is simply how Vantage works; just do it, and confirm the
  list of accomplishments with them. The only clarifying questions worth asking are about the
  accomplishments themselves (scope, their specific role, the outcome).
- Ask how they want to provide the material (chat / UI at `/story-bank` / an existing résumé or
  doc). However it arrives, break it into accomplishment-level entries. A résumé grouped by job
  should be re-split into one entry per accomplishment.
- For each entry: capture the raw facts, then write a coherent first-person narrative **without
  upgrading verbs or inventing anything**. Create it via `create_entry` (MCP) or `POST /api/entries`.
  Dates are optional. If key facts are missing, ask — don't guess.
- `type` (work / project / education / activity) is a loose tag for the accomplishment's context (an
  accomplishment inside a job is usually "work" or "project"); it does not change the
  accomplishment-as-unit rule.

### 2 · Skill portfolio
- Trigger extraction: `extract_skills` (MCP) or `POST /api/ai/extract-skills`. This produces skills
  with weighted evidence links and preserves any prior user curation.
- Show the user the portfolio (`list_skills` / `GET /api/skills`); invite them to rename, merge, or
  recategorize (in chat via `curate_skill`, or in the UI dashboard). Their curation is theirs.

### 3 · Goals & values + talents/interests
- Goals: ask about their ideal work/life (vision), non-negotiables/trade-offs (limits), and how they
  describe themselves (identity). Offer chat / UI (`/goals`) / existing doc. Save via `set_goals`
  (MCP) or `PUT /api/goals`. Explore with them; never prescribe.
- Interests assessment (optional): administer the pluggable instrument in
  `src/lib/assessments/riasec.json` (Holland RIASEC). Ask each item, collect a 0–4 rating on its
  5-point scale, then compute the result with `scoreAssessment()` from
  `src/lib/assessments/types.ts`. Use the top RIASEC code to (a) add supporting notes to goals and
  (b) sanity-check talents. The user can skip this.
- Profile (for later résumé/cover-letter headers): name, email, phone, location, links via
  `set_profile` / `PUT /api/profile`, or the UI `/profile`.

### 4 · Aggregate market research (reference only)
- Ask what direction(s) or roles they're weighing. Research the field yourself (job postings, skill
  demand, how the role is evolving). Two ways to feed it in:
  - Save specific postings as JD sessions: `create_jd_session { text }` / `POST /api/jd-sessions`
    (JSON) — Vantage strips boilerplate and digests them.
  - Or pass your synthesized findings as `marketText` directly to the analysis (next step).
- This is **reference to validate direction**, not a target to conform to.

### 5 · Framework positioning report (the payoff)
For each lens, fetch the assembled context, reason with **your own model**, then persist:
- `get_analysis_context { mode }` (MCP) or `POST /api/ai/paths { mode, contextOnly: true, marketText? }`
  returns `{ system, prompt, meta }` — **no LLM is called server-side**. Modes:
  - `value-chain` — where the evidence places them on the industry value chain; scarce vs commodity
    links; honest pricing power; repositioning moves grounded in existing evidence.
  - `ability-core` — knowledge / skills / **strengths** (strengths inferred ONLY from patterns
    repeating across ≥2 entries, phrased as hypotheses for the user to confirm).
  - `positioning` — center of gravity, distinctive combinations, evidence-strength map.
- Follow the returned `system` instructions exactly; write the report in the user's language.
- Persist each via `save_analysis { kind, content }` / `POST /api/analyses { kind, content,
  source: "agent" }`. It then appears in the app's Dashboard/Paths, tagged as agent-sourced, and
  survives reloads. Walk the user through it and offer to revise.

### 6 · Résumé (hand off to the UI — do NOT generate it here)
Résumé is written **against a specific job the user actually intends to apply to** — not the
aggregate research. Tell them: go to the **Output** page, upload/paste that specific JD, select the
matched evidence, and generate the résumé (North-American format) and cover letter there. Their
Story Bank and profile already feed it.

## Where things live (for reference)
Full REST reference: `public/llms.txt`. Data model & rules: `AGENTS.md`. Why things are the way they
are: `docs/decisions.md`. The frameworks' prompts: `src/lib/ai/frameworks.ts` (Porter value chain;
Buckingham & Clifton talent definition; Holland interests).
