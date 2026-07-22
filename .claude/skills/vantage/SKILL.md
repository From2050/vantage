---
name: vantage
description: Guide the user through a Vantage career analysis — build their evidence-based skill portfolio and produce a framework positioning report. Use when the user asks to "analyze me with Vantage", "use Vantage", run their career analysis, build their skill portfolio, or figure out their positioning/direction. Vantage must be running locally (npm run dev).
---

# Vantage guided analysis

The user wants a career analysis with **Vantage** (this repo — a local, single-user
career-strategy tool). You drive a guided flow and do the reasoning with your own model; Vantage
stores the structured data and renders it in its UI. All the user's data stays on their machine.

**Read `docs/agent-playbook.md` now and follow it.** It is the authoritative script. Summary:

1. Ensure the app is running (`npm run dev`, default http://localhost:3000). Read `GET /api/status`
   to see where to resume. Use the MCP tools if configured, else REST per `public/llms.txt`.
2. **Stories** → create one entry per experience (`create_entry` / `POST /api/entries`).
3. **Skills** → `extract_skills`; invite curation.
4. **Goals + interests** → `set_goals`; optionally administer `src/lib/assessments/riasec.json`
   (score with `scoreAssessment` in `src/lib/assessments/types.ts`); set profile.
5. **Aggregate market research** (reference only) → `create_jd_session` or pass `marketText`.
6. **Framework report** → `get_analysis_context { mode: value-chain | ability-core | positioning }`
   → reason with your own model → `save_analysis` (appears in the UI, tagged agent-sourced).
7. **Résumé** → hand off to the Output page against the user's *specific* target JD; do not generate
   it in chat.

Non-negotiable rules (product identity — never break):
- The user is the sole authority on their experience. Never invent or upgrade facts; preserve verb
  strength exactly (never turn "helped" into "led").
- Reason from their skills outward; market data is reference, not a mold.
- Offer choice every step: do it in chat / fill in the UI / hand over an existing doc.
- Persist everything through the API so the UI and you share one dataset.
