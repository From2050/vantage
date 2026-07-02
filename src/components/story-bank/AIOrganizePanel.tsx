'use client';

import { useState } from 'react';
import type { Entry, EntryType } from '@/types';
import { ENTRY_TYPE_META } from '@/components/story-bank/entryMeta';
import type { StructuredEntry } from '@/lib/ai/structure';

export default function AIOrganizePanel({
  rawNotes,
  type,
  title,
  onApply,
}: {
  rawNotes: string;
  type: EntryType;
  title: string;
  onApply: (fields: Partial<Entry>) => void;
}) {
  const [proposal, setProposal] = useState<StructuredEntry | null>(null);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const canRun = rawNotes.trim().length > 0 && !loading;

  async function run() {
    setLoading(true);
    setError('');
    setProposal(null);
    setApplied(false);
    try {
      const res = await fetch('/api/ai/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawNotes, type, title }),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      const result: StructuredEntry = await res.json();
      setProposal(result);
      setNarrative(result.refinedNarrative);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!proposal) return;
    onApply({
      title: proposal.title,
      type: proposal.type,
      organization: proposal.organization,
      dateFrom: proposal.dateFrom,
      dateTo: proposal.dateTo,
      refinedNarrative: narrative,
      keyHighlights: proposal.keyHighlights,
      tags: proposal.tags,
    });
    setApplied(true);
  }

  const dateLabel = proposal
    ? [proposal.dateFrom, proposal.dateTo].filter(Boolean).join(' – ') || '—'
    : '';

  return (
    <div className="rounded-lg border border-black/10 bg-black/[.02] p-4 dark:border-white/15 dark:bg-white/[.03]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">AI assist</h2>
        <button
          onClick={run}
          disabled={!canRun}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Working…' : proposal ? 'Re-run' : 'Structure from notes'}
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/50">
        Reads your raw notes and proposes a title, type, organization, dates, narrative, highlights,
        and tags. It won&apos;t upgrade verbs or invent facts — review and apply.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10">
          {error}
        </p>
      )}

      {!proposal && !loading && !error && (
        <p className="mt-3 text-xs text-foreground/40">
          {rawNotes.trim() ? 'Click “Structure from notes” to draft a full card.' : 'Add raw notes first.'}
        </p>
      )}

      {proposal && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field label="Title" value={proposal.title || '—'} />
            <Field label="Type" value={ENTRY_TYPE_META[proposal.type].label} />
            <Field label="Organization" value={proposal.organization || '—'} />
            <Field label="Dates" value={dateLabel} />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-foreground/60">Narrative (editable)</p>
            <textarea
              className="min-h-32 w-full resize-y rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>

          <div className="text-xs text-foreground/50">
            {proposal.keyHighlights.length} highlight{proposal.keyHighlights.length === 1 ? '' : 's'} ·{' '}
            {proposal.tags.length} tag{proposal.tags.length === 1 ? '' : 's'}
            {proposal.tags.length > 0 && <> · {proposal.tags.join(', ')}</>}
          </div>

          {proposal.questions.length > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-medium">To make this stronger, add detail on:</p>
              <ul className="mt-1 list-disc pl-4">
                {proposal.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={apply}
              className="rounded-md border border-foreground/30 px-3 py-1.5 text-xs font-medium hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              Apply to card
            </button>
            {applied && <span className="text-xs text-emerald-600">Applied ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 px-2 py-1.5 dark:border-white/15">
      <div className="text-[10px] uppercase tracking-wide text-foreground/45">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}
