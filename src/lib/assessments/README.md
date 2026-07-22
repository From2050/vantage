# Assessments

Pluggable talents/interests instruments. An assessment is a JSON questionnaire conforming to
`Assessment` in `types.ts`, plus the pure `scoreAssessment()` scorer. It fills the **interest** side
of interest–ability–value alignment (ability = evidenced skills; value = goals). Talents themselves
are inferred primarily from cross-entry behavioral patterns in the `ability-core` analysis; the
assessment corroborates.

## Default: `riasec.json`

Holland's RIASEC vocational-interest model (John L. Holland, *Making Vocational Choices*, 1973),
activity-rating format modeled on the public-domain **O\*NET Interest Profiler** (U.S. Department of
Labor). 6 dimensions × 5 items, 5-point like/dislike scale.

## How it's used

The guided agent (`docs/agent-playbook.md`) administers it conversationally: asks each item, collects
a 0–4 rating, calls `scoreAssessment(assessment, responses)`, and uses the top RIASEC code to (a)
write supporting text into the user's goals and (b) sanity-check the inferred talents. No quiz UI
ships yet — it's agent-run.

## Swapping the instrument

Drop in any file conforming to `types.ts` and load it instead of `riasec.json`. Rules:

- `dimensions[].id` are the scoring buckets; every `items[].dimension` must match one.
- `scale` is ordered low→high; responses are 0-based indices into it.
- Put the **primary source + license/provenance** in the `source` field.
- **Do not reproduce a trademarked instrument's items** (e.g. MBTI, CliftonStrengths). For a
  personality alternative, use public-domain **IPIP** Big Five items. Custom questionnaires are fine.

`scoreAssessment()` is instrument-agnostic — no code change needed to swap.
