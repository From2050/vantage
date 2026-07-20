import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Reuse the connection across hot-reloads in dev to avoid leaking file handles.
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

// VANTAGE_DB switches the database file — used for isolated profiles (e.g.
// validation subjects: `VANTAGE_DB=validation/subject-a.sqlite npm run dev`)
// without ever touching the owner's db.sqlite.
const sqlite =
  globalForDb.sqlite ??
  (() => {
    const conn = new Database(process.env.VANTAGE_DB ?? 'db.sqlite');
    conn.pragma('journal_mode = WAL');
    return conn;
  })();

if (process.env.NODE_ENV !== 'production') globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
