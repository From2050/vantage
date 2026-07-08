#!/usr/bin/env node
// Load the fictional demo profile into db.sqlite from the CLI: `npm run db:seed`.
// Self-contained (raw SQL, no app imports) so it runs on a fresh clone right
// after `npm run db:push`. Reads the same persona.json the in-app button uses.
// WARNING: replaces existing Story Bank / skills / goals / profile / analyses.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const persona = JSON.parse(readFileSync(join(root, 'src/lib/demo/persona.json'), 'utf8'));
const db = new Database(join(root, 'db.sqlite'));
const now = Date.now();
const USER_ID = 'local';

const tx = db.transaction(() => {
  for (const t of ['entry_skills', 'skills', 'entries', 'goals_document', 'profile', 'jd_sessions', 'resume_outputs', 'cover_letters', 'path_plans', 'analyses']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }

  const insE = db.prepare(
    'INSERT INTO entries (id,title,type,organization,date_from,date_to,raw_notes,refined_narrative,key_highlights,tags,created_at,updated_at) VALUES (@id,@title,@type,@organization,@dateFrom,@dateTo,@rawNotes,@refinedNarrative,@keyHighlights,@tags,@createdAt,@updatedAt)',
  );
  persona.entries.forEach((e, i) =>
    insE.run({
      ...e,
      keyHighlights: JSON.stringify(e.keyHighlights),
      tags: JSON.stringify(e.tags),
      createdAt: now,
      updatedAt: now - i,
    }),
  );

  const insS = db.prepare('INSERT INTO skills (id,name,category,created_at,updated_at) VALUES (@id,@name,@category,@createdAt,@updatedAt)');
  for (const s of persona.skills) insS.run({ ...s, createdAt: now, updatedAt: now });

  const insL = db.prepare('INSERT INTO entry_skills (entry_id,skill_id,weight) VALUES (@entryId,@skillId,@weight)');
  for (const l of persona.entrySkills) insL.run(l);

  db.prepare('INSERT INTO goals_document (id,vision_text,limits_text,identity_text,ai_summary,updated_at) VALUES (?,?,?,?,?,?)').run(
    USER_ID, persona.goals.visionText, persona.goals.limitsText, persona.goals.identityText, '', now,
  );
  db.prepare('INSERT INTO profile (id,full_name,headline,email,phone,location,links,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(
    USER_ID, persona.profile.fullName, persona.profile.headline, persona.profile.email, persona.profile.phone, persona.profile.location, JSON.stringify(persona.profile.links), now,
  );
  const insA = db.prepare('INSERT INTO analyses (id,kind,content,source,created_at) VALUES (@id,@kind,@content,@source,@createdAt)');
  for (const a of persona.analyses) insA.run({ ...a, createdAt: now });
});

tx();
console.log(`Seeded demo profile: ${persona.entries.length} entries, ${persona.skills.length} skills.`);
db.close();
