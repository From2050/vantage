'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';
import type { Profile } from '@/types';

function buildHeader(p: Profile | null): string {
  if (!p) return '';
  const lines: string[] = [];
  if (p.fullName) lines.push(`# ${p.fullName}`);
  if (p.headline) lines.push(`_${p.headline}_`);
  const contact = [p.email, p.phone, p.location, ...p.links].filter(Boolean).join(' · ');
  if (contact) lines.push(contact);
  return lines.join('\n\n');
}

export default function ResumePreview({
  jdSessionId,
  selectedEntryIds,
}: {
  jdSessionId: string;
  selectedEntryIds: string[];
}) {
  const [body, setBody] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((p: Profile | null) => setProfile(p))
      .catch(() => {});
  }, []);

  const header = buildHeader(profile);
  const fullMarkdown = [header, body].filter(Boolean).join('\n\n');
  const hasContact = !!profile?.fullName;

  const canGenerate = selectedEntryIds.length > 0 && !loading;

  async function generate() {
    setLoading(true);
    setError('');
    setBody('');
    setCopied(false);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdSessionId, selectedEntryIds }),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      await readTextStream(res, setBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(fullMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    const res = await fetch('/api/output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdSessionId, selectedEntryIds, generatedResume: fullMarkdown }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Generating…' : body ? 'Regenerate résumé' : 'Generate résumé'}
        </button>
        {body && !loading && (
          <>
            <button
              onClick={copy}
              className="rounded-md border border-black/15 px-3 py-2 text-sm hover:border-foreground/40 dark:border-white/20"
            >
              {copied ? 'Copied ✓' : 'Copy Markdown'}
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

      {body && !hasContact && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          No contact header yet — add your name and details in{' '}
          <a href="/profile" className="underline">
            Profile
          </a>
          .
        </p>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>
      )}

      {(body || loading) && (
        <div className="resume-doc rounded-lg border border-black/10 bg-white p-8 text-sm text-zinc-900 shadow-sm dark:border-white/15">
          {header && (
            <div className="resume-head">
              <ReactMarkdown>{header}</ReactMarkdown>
            </div>
          )}
          {body ? <ReactMarkdown>{body}</ReactMarkdown> : <p className="text-zinc-400">Streaming…</p>}
        </div>
      )}
    </div>
  );
}
