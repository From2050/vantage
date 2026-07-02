'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Entry, Skill, SkillCategory } from '@/types';
import { SKILL_CATEGORIES } from '@/types';
import { strengthOf, WEIGHT_LABEL, type SkillStrength } from '@/lib/skillScore';

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  technical: 'Technical',
  tool: 'Tools & languages',
  domain: 'Domain knowledge',
  soft: 'Transferable',
};

function LevelBadge({ level }: { level: number }) {
  return (
    <span
      className={`inline-flex w-11 shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        level >= 4
          ? 'bg-[var(--accent)] text-white'
          : level === 3
            ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
            : 'bg-black/[.06] text-foreground/60 dark:bg-white/10'
      }`}
    >
      Lv.{level}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  // Segmented bar (5 cells of 20) — reads like a game stat, still precise.
  const cells = [0, 1, 2, 3, 4];
  return (
    <span className="flex flex-1 items-center gap-1" title={`${score}/100`}>
      {cells.map((i) => {
        const fill = Math.max(0, Math.min(1, (score - i * 20) / 20));
        return (
          <span key={i} className="relative h-2 flex-1 overflow-hidden rounded-sm bg-black/[.06] dark:bg-white/10">
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-[var(--accent)]"
              style={{ width: `${fill * 100}%`, opacity: 0.55 + 0.45 * fill }}
            />
          </span>
        );
      })}
    </span>
  );
}

export default function SkillPortfolio() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/skills').then((r) => r.json()),
      fetch('/api/entries').then((r) => r.json()),
    ])
      .then(([s, e]: [Skill[], Entry[]]) => {
        setSkills(s);
        setEntries(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const entryTitle = useMemo(() => {
    const m = new Map(entries.map((e) => [e.id, e.title || 'Untitled']));
    return (id: string) => m.get(id) ?? '(deleted entry)';
  }, [entries]);

  const strengths = useMemo(() => {
    const m = new Map<string, SkillStrength>();
    for (const s of skills) m.set(s.id, strengthOf(s, entries));
    return m;
  }, [skills, entries]);

  async function extract() {
    setExtracting(true);
    setError('');
    try {
      const res = await fetch('/api/ai/extract-skills', { method: 'POST' });
      if (!res.ok) {
        setError((await res.text()) || 'Extraction failed');
        return;
      }
      setSkills(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  async function patchSkill(id: string, partial: { name?: string; category?: SkillCategory }) {
    const res = await fetch(`/api/skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      const updated = await res.json();
      setSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: updated.name, category: updated.category } : s)),
      );
    }
  }

  async function removeSkill(id: string) {
    if (!confirm('Remove this skill from your portfolio?')) return;
    await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setOpenId(null);
  }

  async function mergeSkill(fromId: string, toId: string) {
    const res = await fetch('/api/skills/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId, toId }),
    });
    if (res.ok) {
      const fresh: Skill[] = await fetch('/api/skills').then((r) => r.json());
      setSkills(fresh);
      setOpenId(null);
    }
  }

  if (loading) return <p className="text-sm text-foreground/50">Loading…</p>;

  const grouped = SKILL_CATEGORIES.map((c) => ({
    category: c,
    items: skills
      .filter((s) => s.category === c)
      .sort((a, b) => (strengths.get(b.id)?.score ?? 0) - (strengths.get(a.id)?.score ?? 0)),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Skill portfolio</h2>
        <button
          onClick={extract}
          disabled={extracting}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {extracting ? 'Extracting…' : skills.length ? 'Re-extract from entries' : 'Extract from entries'}
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/50">
        Strength = weighted evidence × recency, 0–100. Click a skill to see evidence and curate.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10">{error}</p>
      )}

      {skills.length === 0 && !extracting && (
        <p className="mt-4 rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-foreground/55 dark:border-white/20">
          No skills extracted yet. Add entries in your{' '}
          <Link href="/story-bank" className="underline">
            Story Bank
          </Link>
          , then extract your portfolio.
        </p>
      )}

      <div className="mt-4 space-y-5">
        {grouped.map((g) => (
          <div key={g.category}>
            <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/45">
              {CATEGORY_LABEL[g.category]}
            </h3>
            <ul className="space-y-1">
              {g.items.map((s) => {
                const open = openId === s.id;
                const st = strengths.get(s.id)!;
                return (
                  <li
                    key={s.id}
                    className="rounded-md border border-transparent hover:border-black/10 dark:hover:border-white/15"
                  >
                    <button
                      className="flex w-full items-center gap-3 px-2 py-1.5 text-left text-sm"
                      onClick={() => {
                        setOpenId(open ? null : s.id);
                        setRenameText(s.name);
                      }}
                    >
                      <LevelBadge level={st.level} />
                      <span className="w-40 shrink-0 truncate text-foreground/85" title={s.name}>
                        {s.name}
                      </span>
                      <ScoreBar score={st.score} />
                      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground/50">
                        {st.score}
                      </span>
                    </button>

                    {open && (
                      <div className="space-y-3 border-t border-black/[.06] px-2 py-3 dark:border-white/10">
                        <ul className="space-y-1 text-xs text-foreground/65">
                          {s.evidence.map((ev) => (
                            <li key={ev.entryId} className="flex items-center gap-2">
                              <span
                                className={`inline-block w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium ${
                                  ev.weight === 3
                                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                                    : ev.weight === 2
                                      ? 'bg-black/[.06] dark:bg-white/10'
                                      : 'border border-black/10 text-foreground/45 dark:border-white/15'
                                }`}
                              >
                                {WEIGHT_LABEL[ev.weight]}
                              </span>
                              <span className="truncate">{entryTitle(ev.entryId)}</span>
                            </li>
                          ))}
                          {s.evidence.length === 0 && <li>(no evidence links)</li>}
                        </ul>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <input
                            className="w-40 rounded border border-black/15 bg-transparent px-2 py-1 outline-none focus:border-foreground/50 dark:border-white/20"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onBlur={() => {
                              if (renameText.trim() && renameText !== s.name)
                                patchSkill(s.id, { name: renameText.trim() });
                            }}
                          />
                          <select
                            className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                            value={s.category}
                            onChange={(e) => patchSkill(s.id, { category: e.target.value as SkillCategory })}
                          >
                            {SKILL_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {CATEGORY_LABEL[c]}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) mergeSkill(s.id, e.target.value);
                            }}
                          >
                            <option value="">Merge into…</option>
                            {skills
                              .filter((o) => o.id !== s.id)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => removeSkill(s.id)}
                            className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
