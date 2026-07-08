# Verification gates

Runnable quality gates with exact commands and pass criteria. Run the gates relevant to your
change (mapping at the bottom); G7 always. All commands assume the dev server is running
(`npm run dev`, http://localhost:3000) with a working provider configured.

> These gates exist because each one caught (or was designed against) a real failure during v1
> development. Do not delete a gate without recording why in docs/decisions.md.

## G1 — Verb fidelity (the founding gate)

AI must never upgrade the user's verbs. Test with this exact input:

```bash
curl -s -X POST http://localhost:3000/api/ai/structure -H 'Content-Type: application/json' \
  -d '{"rawNotes":"I helped my team debug a firmware issue and we eventually found the problem"}' \
| node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const o=JSON.parse(d); const t=o.refinedNarrative+' '+o.keyHighlights.join(' ');
  const bad=t.match(/\b(led|owned|drove|spearheaded|managed|headed|orchestrated)\b/gi);
  console.log(bad?'FAIL — upgraded verbs: '+bad:'PASS — no verb upgrades');})"
```

**Pass:** no forbidden verbs. Also spot-check `/api/ai/organize` and `/api/ai/generate` outputs
after editing their prompts. On `tier: basic` providers, paraphrase of "helped" is tolerated;
upgrades are never tolerated.

## G2 — No invention

Generate from an entry with NO metrics, then scan the output for numbers/achievements that aren't
in the source. Quick heuristic:

```bash
# After generating a résumé/cover letter from known entries:
# every %, ×, $ figure and team-size claim in the output must exist in some source entry.
grep -oE '[0-9]+(\.[0-9]+)?(%|x|k| people| engineers)' output.md   # then verify each against sources
```

**Pass:** every quantitative claim traces to a source entry.

## G3 — Résumé section routing

Education entries must appear ONLY under `## Education` (this bug shipped once).

```bash
curl -s -X POST http://localhost:3000/api/ai/generate -H 'Content-Type: application/json' \
  -d '{"jdSessionId":"<id>","selectedEntryIds":["<work-id>","<education-id>"]}' > /tmp/resume.md
node -e "const r=require('fs').readFileSync('/tmp/resume.md','utf8');
  const sec=n=>{const m=r.match(new RegExp('## '+n+'([\\\\s\\\\S]*?)(?=\\\\n## |$)'));return m?m[1]:''};
  const eduInExp=/B\.S\.|M\.S\.|University|degree/i.test(sec('Experience'));
  console.log(eduInExp?'FAIL — education leaked into Experience':'PASS');"
```

## G4 — Curation survives re-extraction

```bash
B=http://localhost:3000
SID=$(curl -s $B/api/skills | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].id))")
curl -s -X PATCH $B/api/skills/$SID -H 'Content-Type: application/json' -d '{"name":"__CURATION_TEST__"}' >/dev/null
curl -s -X POST $B/api/ai/extract-skills | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const a=JSON.parse(d); const kept=a.some(s=>s.name==='__CURATION_TEST__');
  console.log(kept?'PASS — rename survived, total '+a.length:'FAIL — curation lost');})"
# then rename back via PATCH
```

**Pass:** renamed skill keeps its name and id; no duplicate under the old name; weights present
(1–3) on evidence links.

## G5 — Provider switching

```bash
B=http://localhost:3000
curl -s -X PUT $B/api/settings -H 'Content-Type: application/json' -d '{"provider":"openai-compat","baseUrl":"http://localhost:11434/v1","model":"llama3.2:latest","tier":"basic"}'
curl -s $B/api/ai/capabilities        # expect webSearch:false, tier:basic
curl -s -X PUT $B/api/settings -H 'Content-Type: application/json' -d '{"provider":"gemini"}'
curl -s -X POST $B/api/settings/test  # expect ok:true — key must have survived the round trip
```

**Pass:** switching away and back never loses a stored key (merge-save, decisions.md D8); keys in
GET responses are masked; capabilities reflect the active provider immediately (no restart).

## G6 — Agent loop (context mode)

```bash
B=http://localhost:3000
curl -s -X POST $B/api/ai/skill-analysis -H 'Content-Type: application/json' -d '{"contextOnly":true}' \
| node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);
  console.log(o.system&&o.prompt&&o.meta.writeBack?'PASS context':'FAIL');})"
curl -s -X POST $B/api/analyses -H 'Content-Type: application/json' \
  -d '{"kind":"skill","content":"## gate test","source":"agent"}'
# → reload dashboard: analysis appears with the "by your agent" tag. Then delete the test row.
```

**Pass:** contextOnly returns non-empty system+prompt+meta with no LLM call; agent write-back
renders in the UI with agent provenance. Every persisted analysis kind must render somewhere.

## G7 — Static (always)

```bash
npx tsc --noEmit && npm run build
```

## Release checklist (before pushing anything public)

1. **Secrets scan** (tracked files only):
   `git ls-files | xargs grep -lE "AQ\.[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30}|sk-[A-Za-z0-9]{20,}" || echo clean`
2. **No data files tracked**: `git ls-files | grep -E "db\.sqlite|^\.env" ` must return only `.env.example`.
3. G7 clean; gates relevant to the release's changes pass.
4. `public/llms.txt` and `mcp/index.mjs` reflect current routes (R4 in AGENTS.md).

## Demo-data screenshot procedure (public assets — never real data)

The demo persona is `src/lib/demo/persona.json`; seed it with `npm run db:seed` (or the in-app
"Try with demo data" button on an empty dashboard).

```bash
cp db.sqlite /tmp/vantage-real-backup.db          # 1. back up the real DB
npm run db:seed                                    # 2. replace with the fictional persona
# 3. RESTART the dev server (or start it now); it caches the DB — stale reads otherwise
# 4. capture (puppeteer-core with system Chrome, deviceScaleFactor 2, dark scheme) → docs/images/
# 5. RESTORE — CRITICAL, SQLite WAL trap:
#    Stop the dev server FIRST, then clear the WAL, THEN copy back. Copying only db.sqlite
#    while the server runs leaves demo writes in db.sqlite-wal and they reappear on next read.
#    (stop server) && rm -f db.sqlite-wal db.sqlite-shm && cp /tmp/vantage-real-backup.db db.sqlite
# 6. Verify with a FRESH connection: node -e "…SELECT count(*) FROM entries" shows the real count.
```

## Change → gate mapping

| You changed… | Run |
| --- | --- |
| Any AI prompt touching experience (organize/structure/generate/cover/split) | G1, G2, G7 |
| Résumé generator | G1, G2, G3, G7 |
| Skill extraction / skill score | G4, G7 (+ eyeball dashboard) |
| Provider layer / settings | G5, G7 (all four call shapes vs real provider) |
| Analysis endpoints / MCP / llms.txt | G6, G7 |
| Schema | `npm run db:push`, mappers/types updated, G7 |
| Anything else | G7 |
