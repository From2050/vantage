'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';

interface SavedAnalysis {
  id: string;
  kind: string;
  content: string;
  source: 'app' | 'agent';
  createdAt: number;
}

export default function SkillAnalysis({ disabled }: { disabled: boolean }) {
  const [text, setText] = useState('');
  const [meta, setMeta] = useState<{ createdAt: number; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load the latest persisted analysis so it survives reloads.
  useEffect(() => {
    fetch('/api/analyses?kind=skill&latest=1')
      .then((r) => r.json())
      .then((a: SavedAnalysis | null) => {
        if (a) {
          setText(a.content);
          setMeta({ createdAt: a.createdAt, source: a.source });
        }
      })
      .catch(() => {});
  }, []);

  async function run() {
    setLoading(true);
    setError('');
    setText('');
    setMeta(null);
    try {
      const res = await fetch('/api/ai/skill-analysis', { method: 'POST' });
      if (!res.ok) {
        setError((await res.text()) || 'Analysis failed');
        return;
      }
      const full = await readTextStream(res, setText);
      if (full.trim()) {
        await fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'skill', content: full, source: 'app' }),
        });
        setMeta({ createdAt: Date.now(), source: 'app' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Skill direction analysis</h2>
        <button
          onClick={run}
          disabled={disabled || loading}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Analyzing…' : text ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/50">
        Clusters, strengths, gaps vs. your goals, suggested directions.
        {meta && (
          <span className="ml-2 text-foreground/40">
            {new Date(meta.createdAt).toLocaleString()}
            {meta.source === 'agent' && ' · by your agent'}
          </span>
        )}
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10">
          {error}
        </p>
      )}

      {(text || loading) && (
        <div className="prose-vantage mt-3 max-h-[30rem] overflow-y-auto rounded-md border border-black/10 bg-surface p-4 text-sm dark:border-white/15">
          {text ? <ReactMarkdown>{text}</ReactMarkdown> : <p className="text-foreground/40">Streaming…</p>}
        </div>
      )}
    </div>
  );
}
