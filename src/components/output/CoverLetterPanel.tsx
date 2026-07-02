'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';

interface Source {
  title: string;
  uri: string;
}

export default function CoverLetterPanel({
  jdSessionId,
  selectedEntryIds,
  roleHint,
}: {
  jdSessionId: string;
  selectedEntryIds: string[];
  roleHint?: string;
}) {
  const [companyName, setCompanyName] = useState('');
  const [companyInfo, setCompanyInfo] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchErr, setResearchErr] = useState('');

  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function research() {
    if (!companyName.trim()) return;
    setResearching(true);
    setResearchErr('');
    setSources([]);
    try {
      const res = await fetch('/api/ai/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName, role: roleHint }),
      });
      if (!res.ok) {
        setResearchErr((await res.text()) || 'Research failed');
        return;
      }
      const data: { text: string; sources: Source[] } = await res.json();
      setCompanyInfo((prev) => (prev.trim() ? `${prev}\n\n${data.text}` : data.text));
      setSources(data.sources);
    } catch (e) {
      setResearchErr(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setResearching(false);
    }
  }

  async function generate() {
    setLoading(true);
    setError('');
    setLetter('');
    setCopied(false);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdSessionId, selectedEntryIds, companyName, companyInfo }),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      await readTextStream(res, setLetter);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const res = await fetch('/api/cover-letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdSessionId, companyName, content: letter }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  const inputCls =
    'w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="mb-1 block text-sm font-medium">Company</label>
          <input
            className={inputCls}
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <button
          onClick={research}
          disabled={!companyName.trim() || researching}
          className="h-10 rounded-md border border-black/15 px-3 text-sm hover:border-foreground/40 disabled:opacity-40 dark:border-white/20"
        >
          {researching ? 'Researching…' : 'Research with AI'}
        </button>
      </div>

      {researchErr && <p className="text-xs text-red-600">{researchErr}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Company info <span className="font-normal text-foreground/40">(manual or AI-researched)</span>
        </label>
        <textarea
          className={`${inputCls} min-h-28 resize-y`}
          placeholder="What the company does, its values, why you're interested… or use Research with AI."
          value={companyInfo}
          onChange={(e) => setCompanyInfo(e.target.value)}
        />
        {sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/50">
            <span>Sources:</span>
            {sources.map((s) => (
              <a key={s.uri} href={s.uri} target="_blank" rel="noreferrer" className="underline hover:text-foreground/80">
                {s.title.slice(0, 40)}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={loading || selectedEntryIds.length === 0}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Writing…' : letter ? 'Regenerate' : 'Generate cover letter'}
        </button>
        {letter && !loading && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(letter);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-md border border-black/15 px-3 py-2 text-sm hover:border-foreground/40 dark:border-white/20"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <button
              onClick={save}
              className="rounded-md border border-black/15 px-3 py-2 text-sm hover:border-foreground/40 dark:border-white/20"
            >
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </>
        )}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}

      {(letter || loading) && (
        <div className="resume-doc rounded-lg border border-black/10 bg-white p-8 text-sm text-zinc-900 shadow-sm dark:border-white/15">
          {letter ? <ReactMarkdown>{letter}</ReactMarkdown> : <p className="text-zinc-400">Streaming…</p>}
        </div>
      )}
    </div>
  );
}
