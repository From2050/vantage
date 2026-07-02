'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';

export default function AIExplorerPanel({
  vision,
  limits,
  identity,
  savedSummary,
  onSaveSummary,
}: {
  vision: string;
  limits: string;
  identity: string;
  savedSummary: string;
  onSaveSummary: (summary: string) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const canExplore = (vision.trim() || limits.trim() || identity.trim()) && !loading;

  async function explore() {
    setLoading(true);
    setError('');
    setText('');
    setSaved(false);
    try {
      const res = await fetch('/api/ai/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionText: vision, limitsText: limits, identityText: identity }),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      await readTextStream(res, setText);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-black/[.02] p-4 dark:border-white/15 dark:bg-white/[.03]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">AI Explorer</h2>
        <button
          onClick={explore}
          disabled={!canExplore}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Exploring…' : text ? 'Re-run' : 'Explore with AI'}
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/50">
        Asks questions where you&apos;re thin, maps possibilities, and surfaces tensions — it
        won&apos;t tell you what to want.
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10">
          {error}
        </p>
      )}

      {!text && !loading && !error && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-foreground/40">
            {canExplore || vision.trim() || limits.trim() || identity.trim()
              ? 'Click “Explore with AI” to get questions and a possibilities analysis.'
              : 'Fill in at least one section first.'}
          </p>
          {savedSummary && (
            <div className="rounded-md border border-black/10 p-3 dark:border-white/15">
              <p className="mb-1 text-xs font-medium text-foreground/60">Saved summary</p>
              <div className="prose-vantage text-sm">
                <ReactMarkdown>{savedSummary}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {(text || loading) && (
        <>
          <div className="prose-vantage mt-3 max-h-[28rem] overflow-y-auto rounded-md border border-black/10 bg-background p-3 text-sm dark:border-white/15">
            {text ? <ReactMarkdown>{text}</ReactMarkdown> : <p className="text-foreground/40">Streaming…</p>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                onSaveSummary(text);
                setSaved(true);
              }}
              disabled={loading || !text}
              className="rounded-md border border-foreground/30 px-3 py-1.5 text-xs font-medium hover:bg-black/[.04] disabled:opacity-40 dark:hover:bg-white/[.06]"
            >
              Save as summary
            </button>
            {saved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          </div>
        </>
      )}
    </div>
  );
}
