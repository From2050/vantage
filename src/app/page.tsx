import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowToEntry } from '@/lib/db/mappers';
import { listSkills } from '@/lib/db/skills';
import { strengthOf } from '@/lib/skillScore';
import { APP_NAME, USER_ID } from '@/lib/constants';
import type { SkillCategory } from '@/types';
import SkillAnalysis from '@/components/dashboard/SkillAnalysis';
import SkillPortfolio from '@/components/dashboard/SkillPortfolio';
import RadarPanel from '@/components/dashboard/RadarPanel';
import SkillTimeline from '@/components/dashboard/SkillTimeline';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  technical: 'Technical',
  tool: 'Tools',
  domain: 'Domain',
  soft: 'Transferable',
};

export default function Dashboard() {
  const entries = db.select().from(schema.entries).all().map(rowToEntry);
  const skills = listSkills();
  const goals = db.select().from(schema.goalsDocument).all().find((g) => g.id === USER_ID);
  const profile = db.select().from(schema.profile).all().find((p) => p.id === USER_ID);
  const recentOutputs = db
    .select()
    .from(schema.resumeOutputs)
    .orderBy(desc(schema.resumeOutputs.createdAt))
    .all();

  const scored = skills
    .map((s) => ({ skill: s, strength: strengthOf(s, entries) }))
    .sort((a, b) => b.strength.score - a.strength.score);

  // Radar lens 1: top 6 skills as game-stat axes.
  const radarAxes = scored.slice(0, 6).map(({ skill, strength }) => ({
    label: skill.name,
    value: strength.score / 100,
    hint: `${skill.name}: ${strength.score}/100 (Lv.${strength.level}) · ${skill.evidence.length} evidence`,
  }));

  // Stats
  const lv4plus = scored.filter((s) => s.strength.level >= 4).length;
  const evidenced = entries.filter((e) => e.refinedNarrative.trim()).length;
  const coverage = entries.length ? Math.round((evidenced / entries.length) * 100) : 0;

  const massByCategory = new Map<SkillCategory, number>();
  for (const { skill, strength } of scored) {
    massByCategory.set(skill.category, (massByCategory.get(skill.category) ?? 0) + strength.score);
  }
  const strongestCategory =
    [...massByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Radar lens 2: category balance (mass = summed strength per category, normalized).
  const maxMass = Math.max(1, ...massByCategory.values());
  const categoryAxes = [...massByCategory.entries()].map(([cat, mass]) => {
    const top = scored
      .filter((s) => s.skill.category === cat)
      .slice(0, 3)
      .map((s) => s.skill.name)
      .join(', ');
    return {
      label: CATEGORY_LABEL[cat],
      value: mass / maxMass,
      hint: `${CATEGORY_LABEL[cat]} — total strength ${Math.round(mass)}. Top: ${top}`,
    };
  });

  const latestEvidence = entries
    .map((e) => e.updatedAt)
    .sort((a, b) => b - a)[0];

  const goalsStarted = !!goals && !!(goals.visionText || goals.limitsText || goals.identityText);
  const profileComplete = !!profile && !!profile.fullName && !!profile.email;

  const stats = [
    { label: 'Skills', value: String(skills.length), sub: `${lv4plus} at Lv.4+` },
    { label: 'Entries', value: String(entries.length), sub: `${coverage}% with narrative` },
    {
      label: 'Strongest area',
      value: strongestCategory ? CATEGORY_LABEL[strongestCategory] : '—',
      sub: scored[0] ? `top: ${scored[0].skill.name}` : '',
    },
    {
      label: 'Last evidence',
      value: latestEvidence ? new Date(latestEvidence).toLocaleDateString() : '—',
      sub: `${recentOutputs.length} résumés saved`,
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-foreground/55">
          Your skill composition at a glance — strength, evidence, and where to head next.
        </p>
      </div>

      {/* Setup nudges */}
      {(!profileComplete || !goalsStarted || entries.length === 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {entries.length === 0 && <Nudge href="/story-bank" text="Add your first experience →" />}
          {!profileComplete && <Nudge href="/profile" text="Complete your profile →" />}
          {!goalsStarted && <Nudge href="/goals" text="Define your goals & values →" />}
        </div>
      )}

      {/* Hero: radar + stats */}
      <div className="grid items-center gap-6 rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="flex justify-center">
          {radarAxes.length >= 3 ? (
            <RadarPanel skillAxes={radarAxes} categoryAxes={categoryAxes} />
          ) : (
            <p className="p-8 text-center text-sm text-foreground/50">
              Extract at least 3 skills to see your radar.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-black/[.07] p-4 dark:border-white/10">
              <div className="text-xl font-semibold tracking-tight text-[var(--accent)]">{s.value}</div>
              <div className="mt-1 text-xs font-medium text-foreground/60">{s.label}</div>
              {s.sub && <div className="text-[11px] text-foreground/40">{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio + analysis */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SkillPortfolio />
        </section>
        <section>
          <SkillAnalysis disabled={entries.length === 0} />
        </section>
      </div>

      {/* Timeline */}
      {skills.length >= 2 && (
        <section className="rounded-xl border border-black/10 bg-surface p-6 dark:border-white/10">
          <h2 className="mb-1 text-sm font-medium">Skill evolution</h2>
          <p className="mb-4 text-xs text-foreground/50">
            Active evidence span of your strongest skills over time.
          </p>
          <SkillTimeline skills={skills} entries={entries} />
        </section>
      )}
    </div>
  );
}

function Nudge({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/15 px-3 py-1.5 text-foreground/70 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] dark:border-white/20"
    >
      {text}
    </Link>
  );
}
