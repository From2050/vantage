'use client';

import { useEffect, useState } from 'react';
import type { JDSession } from '@/types';

export default function JDUploader({
  onSessionCreated,
}: {
  onSessionCreated: (session: JDSession) => void;
}) {
  const [tab, setTab] = useState<'upload' | 'paste'>('paste');
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<JDSession[]>([]);

  useEffect(() => {
    fetch('/api/jd-sessions')
      .then((r) => r.json())
      .then((s: JDSession[]) => setRecent(s.slice(0, 5)))
      .catch(() => {});
  }, []);

  async function deleteRecent(id: string) {
    if (!confirm('Delete this saved JD?')) return;
    await fetch(`/api/jd-sessions/${id}`, { method: 'DELETE' });
    setRecent((prev) => prev.filter((s) => s.id !== id));
  }

  const canSubmit = !loading && (tab === 'upload' ? !!file : text.trim().length > 0);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (tab === 'upload' && file) {
        fd.set('file', file);
      } else {
        fd.set('text', text);
        if (filename.trim()) fd.set('filename', filename.trim());
      }
      const res = await fetch('/api/jd-sessions', { method: 'POST', body: fd });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      const session: JDSession = await res.json();
      onSessionCreated(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
      <div className="mb-4 flex gap-1 text-sm">
        {(['paste', 'upload'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 ${
              tab === t ? 'bg-black/[.06] font-medium dark:bg-white/10' : 'text-foreground/60'
            }`}
          >
            {t === 'paste' ? 'Paste text' : 'Upload PDF'}
          </button>
        ))}
      </div>

      {tab === 'paste' ? (
        <div className="space-y-3">
          <input
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20"
            placeholder="Label (optional) — e.g. Senior Backend @ Acme"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <textarea
            className="min-h-48 w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20"
            placeholder="Paste the job description here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      ) : (
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background"
        />
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Analyzing JD…' : 'Analyze JD'}
      </button>

      {recent.length > 0 && (
        <div className="mt-5 border-t border-black/[.06] pt-4 dark:border-white/10">
          <p className="mb-2 text-xs font-medium text-foreground/50">
            Recent JDs — reuse without re-analyzing
          </p>
          <ul className="space-y-1">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => onSessionCreated(s)}
                  className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-foreground/75 hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
                  title={s.digest.summary}
                >
                  {s.filename || s.digest.summary.slice(0, 60)}
                </button>
                <button
                  onClick={() => deleteRecent(s.id)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-foreground/40 hover:text-red-500"
                  aria-label="Delete JD"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
