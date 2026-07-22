import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// Array/object columns are stored as JSON strings (keyHighlights, tags, digest,
// selectedEntryIds). Parse/serialize at the API boundary, not in the schema.

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default(''),
  type: text('type').notNull().default('work'), // work | education | project | activity
  organization: text('organization').notNull().default(''),
  dateFrom: text('date_from').notNull().default(''), // "YYYY" or "YYYY-MM"
  dateTo: text('date_to').notNull().default(''), // "YYYY", "YYYY-MM", or "present"
  rawNotes: text('raw_notes').notNull().default(''),
  refinedNarrative: text('refined_narrative').notNull().default(''),
  keyHighlights: text('key_highlights').notNull().default('[]'), // JSON string[]
  tags: text('tags').notNull().default('[]'), // JSON string[]
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// One document per user (USER_ID = 'local'). id holds the user id.
export const goalsDocument = sqliteTable('goals_document', {
  id: text('id').primaryKey(),
  visionText: text('vision_text').notNull().default(''),
  limitsText: text('limits_text').notNull().default(''),
  identityText: text('identity_text').notNull().default(''),
  aiSummary: text('ai_summary').notNull().default(''),
  updatedAt: integer('updated_at').notNull(),
});

export const jdSessions = sqliteTable('jd_sessions', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull().default(''),
  rawContent: text('raw_content').notNull().default(''),
  digest: text('digest').notNull().default('{}'), // JSON JDDigest
  createdAt: integer('created_at').notNull(),
});

// One profile per user (id = USER_ID). Personal/contact info for résumé header + cover letter.
export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull().default(''),
  headline: text('headline').notNull().default(''), // e.g. "Senior Logic Engineer"
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  location: text('location').notNull().default(''),
  links: text('links').notNull().default('[]'), // JSON string[] (GitHub, LinkedIn, portfolio…)
  updatedAt: integer('updated_at').notNull(),
});

export const resumeOutputs = sqliteTable('resume_outputs', {
  id: text('id').primaryKey(),
  jdSessionId: text('jd_session_id').notNull(), // FK -> jd_sessions.id
  selectedEntryIds: text('selected_entry_ids').notNull().default('[]'), // JSON string[]
  generatedResume: text('generated_resume').notNull().default(''), // Markdown
  createdAt: integer('created_at').notNull(),
});

// Skills are first-class: the user's curated skill portfolio, each linked to the
// entries that evidence it. Evidence strength = count/quality of linked entries.
export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull().default('technical'), // technical | tool | domain | soft
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const entrySkills = sqliteTable(
  'entry_skills',
  {
    entryId: text('entry_id').notNull(), // FK -> entries.id
    skillId: text('skill_id').notNull(), // FK -> skills.id
    // Ownership-depth ladder: 4 = led/architected at scale, 3 = owned core,
    // 2 = contributed, 1 = used. Drives skill strength (src/lib/skillScore.ts).
    weight: integer('weight').notNull().default(2),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.skillId] })],
);

// App settings (one row, id = USER_ID). providerConfig JSON:
// { provider: 'gemini' | 'openai-compat', apiKey, baseUrl, model, tier }.
// Keys live ONLY in this local SQLite file (gitignored) — never returned unmasked.
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  providerConfig: text('provider_config').notNull().default('{}'),
  updatedAt: integer('updated_at').notNull(),
});

// Persisted AI analyses (skill-direction, positioning, adjacent paths) so the
// dashboard keeps the latest result across reloads. source = 'app' (in-app AI)
// or 'agent' (written back by an external agent via API/MCP).
export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // skill | positioning | adjacent
  content: text('content').notNull(), // Markdown
  source: text('source').notNull().default('app'), // app | agent
  createdAt: integer('created_at').notNull(),
});

// Saved skill-building roadmaps from the Path Explorer.
export const pathPlans = sqliteTable('path_plans', {
  id: text('id').primaryKey(),
  targetRole: text('target_role').notNull().default(''),
  content: text('content').notNull().default(''), // Markdown
  createdAt: integer('created_at').notNull(),
});

export const coverLetters = sqliteTable('cover_letters', {
  id: text('id').primaryKey(),
  jdSessionId: text('jd_session_id').notNull(), // FK -> jd_sessions.id
  companyName: text('company_name').notNull().default(''),
  content: text('content').notNull().default(''),
  createdAt: integer('created_at').notNull(),
});
