# Framework validation protocol

Before building framework-grounded analysis (value-chain positioning + ability core) into the
product UI, we validate it on 3–5 real people. This document is the pre-registered protocol —
success criteria are fixed here BEFORE running subjects, to prevent post-hoc rationalization.
Background and rationale: docs/decisions.md D14.

## What is being tested

Hypothesis: running a person's evidence base through named career frameworks produces analysis
that changes decisions — not just "interesting reading". The comparison baseline in every
subject's head is "I could paste my résumé into ChatGPT and ask".

## Per-subject flow (~20–30 minutes, run together with the subject)

```bash
# 1. Isolated profile — NEVER touches your own db.sqlite
VANTAGE_DB=validation/subject-a.sqlite npm run db:push
VANTAGE_DB=validation/subject-a.sqlite npm run dev
```

2. **Import their evidence (~2 min):** Story Bank → Import from file (their résumé PDF), or paste.
3. **Curate together (~5 min):** run skill extraction, let THEM fix names/merge duplicates and
   sanity-check the evidence weights. (This step is itself a product-experience test — note
   friction.) If they have goals, 2 minutes in Goals & Values improves the analysis language/fit.
4. **Generate:** `node scripts/framework-report.mjs --label subject-a` (add `--web` for live
   market data if the provider supports it). Report lands in `validation/`.
5. **They read silently.** Watch where they slow down, re-read, or react. Don't explain.
6. **Structured debrief** — ask in order, record verbatim:
   1. 哪一句話讓你想到之前沒想過的事？是哪一句？
   2. 這份分析會改變你未來三個月的任何決定嗎？具體是什麼決定？
   3. 哪部分你覺得是廢話、或像算命？
   4. 比起把履歷貼進 ChatGPT 問建議，這份差在哪？
   5. 你願意為這個付費或推薦給朋友嗎？（1–10，為什麼）
   Plus: which inferred strengths did they confirm vs reject?

## Scoring each subject (1–5)

- **5** — named a concrete decision they will now make differently (job move, project choice,
  positioning change)
- **4** — named a specific non-obvious insight about themselves ("我從來沒把這兩段經歷連起來看")
- **3** — engaged seriously, confirmed/rejected strengths hypotheses, but no decision impact
- **2** — polite interest ("蠻有趣的")
- **1** — dismissed as generic / fortune-telling

## Pre-registered decision rule

- **≥3 of 5 subjects score 4–5** → build framework calibration into the product UI (guided
  stepwise flow, persistent artifacts) and reposition messaging around it.
- **≤1 of 5 scores 4–5** → do NOT build the framework UI. The bottleneck is elsewhere; revisit.
- **In between** → diagnose which framework/section produced the 4–5 moments, revise prompts,
  run one more round of 3 subjects. Maximum two rounds — no infinite tweaking.

Record results in `validation/results.md` (subject label, score, verbatim quotes, prompt-revision
notes). The `validation/` directory is gitignored — subjects are real people; delete their
profile db after the session unless they explicitly ask to keep using it.

## Notes for whoever runs this later

- The report language follows the subject's entries/goals language automatically. If a report
  comes out mixed-language (weak signal — e.g. English entries, empty goals), have the subject
  write one line in Goals & Values in their preferred language and regenerate.
- Subject #0 was the project owner (hardware/EE background) — used to shake out the prompts, not
  counted in the 5.
- Weak local models (tier basic) produce noticeably softer analysis; run validation with a strong
  model so you're testing the framework, not the model floor.
