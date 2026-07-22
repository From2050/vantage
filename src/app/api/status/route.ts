import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { USER_ID } from '@/lib/constants';

// Single-user progress snapshot. Drives the guided flow's "where am I" branching
// (docs/agent-playbook.md) and the dashboard getting-started checklist.
export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = db.select().from(schema.entries).all().length;
  const skills = db.select().from(schema.skills).all().length;
  const jdCount = db.select().from(schema.jdSessions).all().length;
  const resumes = db.select().from(schema.resumeOutputs).all().length;

  const goals = db.select().from(schema.goalsDocument).where(eq(schema.goalsDocument.id, USER_ID)).get();
  const goalsSet = !!goals && !!(goals.visionText.trim() || goals.limitsText.trim() || goals.identityText.trim());

  const profile = db.select().from(schema.profile).where(eq(schema.profile.id, USER_ID)).get();
  const profileSet = !!profile && !!profile.fullName.trim();

  const analysesRows = db.select().from(schema.analyses).all();
  const analyses: Record<string, number> = {};
  for (const a of analysesRows) {
    if (!analyses[a.kind] || a.createdAt > analyses[a.kind]) analyses[a.kind] = a.createdAt;
  }

  const hasFrameworkAnalysis = Object.keys(analyses).some((k) =>
    ['skill', 'positioning', 'value-chain', 'ability-core', 'adjacent'].includes(k),
  );

  return Response.json({
    entries,
    skills,
    jdCount,
    resumes,
    goalsSet,
    profileSet,
    analyses,
    hasFrameworkAnalysis,
  });
}
