'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Entry, EntryType } from '@/types';
import { ENTRY_TYPES } from '@/types';
import { ENTRY_TYPE_META } from '@/components/story-bank/entryMeta';
import AIOrganizePanel from '@/components/story-bank/AIOrganizePanel';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const fieldClass =
  'w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20';

export default function EntryEditorPage() {
  const router = useRouter();
  const { entryId } = useParams<{ entryId: string }>();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');

  // local mirrors for text fields that need transforms
  const [highlightsText, setHighlightsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/entries/${entryId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data: Entry | null) => {
        if (data) {
          setEntry(data);
          setHighlightsText(data.keyHighlights.join('\n'));
          setTagsText(data.tags.join(', '));
        }
      })
      .finally(() => setLoading(false));
  }, [entryId]);

  const patch = useCallback(
    async (partial: Partial<Entry>) => {
      setStatus('saving');
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial),
        });
        if (!res.ok) throw new Error('save failed');
        const updated: Entry = await res.json();
        setEntry(updated);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    },
    [entryId],
  );

  // update local entry state immediately for controlled inputs
  function setField<K extends keyof Entry>(key: K, value: Entry[K]) {
    setEntry((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleDelete() {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    await fetch(`/api/entries/${entryId}`, { method: 'DELETE' });
    router.push('/story-bank');
  }

  async function attachFile(file: File) {
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: fd });
      if (!res.ok) return;
      const { text } = await res.json();
      const next = entry?.rawNotes ? `${entry.rawNotes}\n\n${text}` : text;
      setField('rawNotes', next);
      patch({ rawNotes: next });
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleApply(fields: Partial<Entry>) {
    setEntry((prev) => (prev ? { ...prev, ...fields } : prev));
    if (fields.keyHighlights) setHighlightsText(fields.keyHighlights.join('\n'));
    if (fields.tags) setTagsText(fields.tags.join(', '));
    patch(fields);
  }

  if (loading) return <p className="text-sm text-foreground/50">Loading…</p>;
  if (notFound || !entry)
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground/60">Entry not found.</p>
        <Link href="/story-bank" className="text-sm underline">
          ← Back to Story Bank
        </Link>
      </div>
    );

  const present = entry.dateTo === 'present';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/story-bank" className="text-sm text-foreground/60 hover:underline">
          ← Story Bank
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/50">
            {status === 'saving' && 'Saving…'}
            {status === 'saved' && 'Saved'}
            {status === 'error' && <span className="text-red-500">Save failed</span>}
          </span>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4 content-start">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            className={fieldClass}
            value={entry.title}
            onChange={(e) => setField('title', e.target.value)}
            onBlur={() => patch({ title: entry.title })}
            placeholder="e.g. Backend Engineer, Senior Thesis, Hackathon project"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              className={fieldClass}
              value={entry.type}
              onChange={(e) => {
                const type = e.target.value as EntryType;
                setField('type', type);
                patch({ type });
              }}
            >
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTRY_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Organization</label>
            <input
              className={fieldClass}
              value={entry.organization}
              onChange={(e) => setField('organization', e.target.value)}
              onBlur={() => patch({ organization: entry.organization })}
              placeholder="Company, school, or project name"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              From <span className="font-normal text-foreground/40">(optional)</span>
            </label>
            <input
              className={fieldClass}
              value={entry.dateFrom}
              onChange={(e) => setField('dateFrom', e.target.value)}
              onBlur={() => patch({ dateFrom: entry.dateFrom })}
              placeholder="YYYY or YYYY-MM"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              To <span className="font-normal text-foreground/40">(optional)</span>
            </label>
            <input
              className={`${fieldClass} disabled:opacity-50`}
              value={present ? '' : entry.dateTo}
              disabled={present}
              onChange={(e) => setField('dateTo', e.target.value)}
              onBlur={() => patch({ dateTo: entry.dateTo })}
              placeholder="YYYY or YYYY-MM"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
              <input
                type="checkbox"
                checked={present}
                onChange={(e) => {
                  const next = e.target.checked ? 'present' : '';
                  setField('dateTo', next);
                  patch({ dateTo: next });
                }}
              />
              Present
            </label>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium">Raw notes</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="rounded-md border border-black/15 px-2.5 py-1 text-xs hover:border-foreground/40 disabled:opacity-50 dark:border-white/20"
            >
              {extracting ? 'Reading…' : '+ Attach file'}
            </button>
          </div>
          <p className="mb-1 text-xs text-foreground/50">
            Dump everything as it comes — messy is fine. Or attach a file to pull its text in. Then
            use AI assist →
          </p>
          <textarea
            className={`${fieldClass} min-h-40 resize-y`}
            rows={6}
            value={entry.rawNotes}
            onChange={(e) => setField('rawNotes', e.target.value)}
            onBlur={() => patch({ rawNotes: entry.rawNotes })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Refined narrative (AI or manual)</label>
          <textarea
            className={`${fieldClass} min-h-40 resize-y`}
            rows={6}
            value={entry.refinedNarrative}
            onChange={(e) => setField('refinedNarrative', e.target.value)}
            onBlur={() => patch({ refinedNarrative: entry.refinedNarrative })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Key highlights</label>
          <p className="mb-1 text-xs text-foreground/50">One highlight per line.</p>
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            rows={4}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            onBlur={() =>
              patch({
                keyHighlights: highlightsText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tags</label>
          <p className="mb-1 text-xs text-foreground/50">Comma-separated.</p>
          <input
            className={fieldClass}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            onBlur={() =>
              patch({
                tags: tagsText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>

        <aside className="lg:sticky lg:top-6 h-fit">
          <AIOrganizePanel
            rawNotes={entry.rawNotes}
            type={entry.type}
            title={entry.title}
            onApply={handleApply}
          />
        </aside>
      </div>
    </div>
  );
}
