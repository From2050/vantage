'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Entry, EntryType } from '@/types';
import { ENTRY_TYPES } from '@/types';
import { ENTRY_TYPE_META, formatDateRange } from '@/components/story-bank/entryMeta';

type Filter = 'all' | EntryType;

export default function StoryBankPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/entries')
      .then((r) => r.json())
      .then((data: Entry[]) => setEntries(data))
      .finally(() => setLoading(false));
  }, []);

  async function importFile(file: File) {
    setImporting(true);
    setImportMsg('');
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/ai/import-entries', { method: 'POST', body: fd });
      if (!res.ok) {
        setImportMsg((await res.text()) || 'Import failed');
        return;
      }
      const created: Entry[] = await res.json();
      setEntries((prev) => [...created, ...prev]);
      setImportMsg(`Imported ${created.length} ${created.length === 1 ? 'entry' : 'entries'} — review and refine each.`);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function createEntry() {
    setCreating(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled entry', type: 'work' }),
      });
      const entry: Entry = await res.json();
      router.push(`/story-bank/${entry.id}`);
    } catch {
      setCreating(false);
    }
  }

  const visible = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Story Bank</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Your evidence library — one entry per experience.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:border-foreground/40 disabled:opacity-50 dark:border-white/20"
          >
            {importing ? 'Importing…' : 'Import from file'}
          </button>
          <button
            onClick={createEntry}
            disabled={creating}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New entry'}
          </button>
        </div>
      </div>

      {importMsg && (
        <p className="rounded-md border border-black/10 bg-black/[.02] px-3 py-2 text-sm text-foreground/70 dark:border-white/15 dark:bg-white/[.03]">
          {importMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', ...ENTRY_TYPES] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
              filter === f
                ? 'border-foreground bg-foreground text-background'
                : 'border-black/15 text-foreground/70 hover:border-foreground/40 dark:border-white/20'
            }`}
          >
            {f === 'all' ? 'All' : ENTRY_TYPE_META[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-foreground/50">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 p-10 text-center dark:border-white/20">
          <p className="text-sm text-foreground/60">
            {entries.length === 0
              ? 'No entries yet. Create your first experience entry to start building your library.'
              : 'No entries of this type.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visible.map((e) => {
            const meta = ENTRY_TYPE_META[e.type];
            const range = formatDateRange(e.dateFrom, e.dateTo);
            return (
              <li key={e.id}>
                <Link
                  href={`/story-bank/${e.id}`}
                  className="block rounded-lg border border-black/10 p-4 transition-colors hover:border-foreground/30 dark:border-white/15"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <h2 className="truncate font-medium">{e.title || 'Untitled entry'}</h2>
                      </div>
                      {(e.organization || range) && (
                        <p className="mt-1 text-sm text-foreground/60">
                          {[e.organization, range].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {e.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-black/[.05] px-2 py-0.5 text-xs text-foreground/70 dark:bg-white/10"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
