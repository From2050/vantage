import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  // VANTAGE_DB targets an alternate profile db (see src/lib/db/index.ts).
  dbCredentials: { url: process.env.VANTAGE_DB ?? './db.sqlite' },
} satisfies Config;
