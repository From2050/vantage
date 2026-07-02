'use client';

import { useMemo, useState } from 'react';
import type { Entry, MatchResult } from '@/types';
import { ENTRY_TYPE_META, formatDateRange } from '@/components/story-bank/entryMeta';

function scoreColor(score: number): string {
  // Monochrome: stronger contrast = better fit.
  if (score >= 8) return 'bg-foreground text-background';
  if (score >= 6) return 'bg-foreground/[.14] text-foreground dark:bg-white/20';
  return 'border border-black/20 text-foreground/60 dark:border-white/30';
}

export default function EntrySelector({
  match,
  entries,
  selectedIds,
  onSelectionChange,
}: {
  match: MatchResult;
  entries: Entry[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const matchedIds = useMemo(() => new Set(match.matches.map((m) => m.entryId)), [match]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  }

  function selectTop5() {
    onSelectionChange(match.matches.slice(0, 5).map((m) => m.entryId));
  }

  const unmatched = entries.filter((e) => !matchedIds.has(e.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          AI-matched evidence{' '}
          <span className="text-foreground/50">({match.matches.length})</span>
        </h3>
        {match.matches.length > 0 && (
          <button
            onClick={selectTop5}
            className="rounded-md border border-black/15 px-3 py-1 text-xs hover:border-foreground/40 dark:border-white/20"
          >
            Select top 5
          </button>
        )}
      </div>

      {match.matches.length === 0 ? (
        <p className="text-sm text-foreground/50">
          No entries scored ≥ 4 for this role. Add evidence in the Story Bank, or pick from all
          entries below.
        </p>
      ) : (
        <ul className="space-y-2">
          {match.matches.map((m) => {
            const e = entryById.get(m.entryId);
            if (!e) return null;
            const meta = ENTRY_TYPE_META[e.type];
            return (
              <li
                key={m.entryId}
                className="rounded-lg border border-black/10 p-3 dark:border-white/15"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(m.entryId)}
                    onChange={() => toggle(m.entryId)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(m.score)}`}>
                        {m.score}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="truncate font-medium">{e.title || 'Untitled'}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/70">{m.rationale}</p>
                    {m.framingNote && (
                      <p className="mt-1 text-sm italic text-foreground/55">→ {m.framingNote}</p>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {unmatched.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-sm text-foreground/60 hover:underline"
          >
            {showAll ? '▾ Hide' : '▸ Show'} other entries ({unmatched.length})
          </button>
          {showAll && (
            <ul className="mt-2 space-y-2">
              {unmatched.map((e) => {
                const meta = ENTRY_TYPE_META[e.type];
                const range = formatDateRange(e.dateFrom, e.dateTo);
                return (
                  <li key={e.id} className="rounded-lg border border-dashed border-black/15 p-3 dark:border-white/20">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                      />
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="truncate font-medium">{e.title || 'Untitled'}</span>
                      {range && <span className="text-xs text-foreground/50">{range}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {match.gaps.length > 0 && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Gaps for this role
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900/90 dark:text-amber-200/90">
            {match.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
