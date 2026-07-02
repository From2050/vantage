'use client';

import { useState } from 'react';
import JDUploader from '@/components/output/JDUploader';
import EntrySelector from '@/components/output/EntrySelector';
import ResumePreview from '@/components/output/ResumePreview';
import CoverLetterPanel from '@/components/output/CoverLetterPanel';
import CareerChat from '@/components/output/CareerChat';
import type { Entry, JDSession, MatchResult } from '@/types';

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? '' : 'opacity-50'}`}>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          done
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-foreground text-background'
              : 'border border-black/20 dark:border-white/25'
        }`}
      >
        {done ? '✓' : n}
      </span>
      {label}
    </div>
  );
}

function DigestView({ session }: { session: JDSession }) {
  const d = session.digest;
  return (
    <div className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{session.filename}</h3>
        {d.roleLevel && (
          <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs capitalize dark:bg-white/10">
            {d.roleLevel}
          </span>
        )}
      </div>
      {d.summary && <p className="mt-2 text-foreground/70">{d.summary}</p>}
      {d.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.keywords.map((k) => (
            <span key={k} className="rounded bg-black/[.05] px-2 py-0.5 text-xs text-foreground/70 dark:bg-white/10">
              {k}
            </span>
          ))}
        </div>
      )}
      {d.requirements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-foreground/60">Requirements</p>
          <ul className="mt-1 list-disc pl-5 text-foreground/75">
            {d.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {d.niceToHave.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-foreground/60">Nice to have</p>
          <p className="mt-1 text-foreground/65">{d.niceToHave.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}

export default function OutputPage() {
  const [session, setSession] = useState<JDSession | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');
  const [outputTab, setOutputTab] = useState<'resume' | 'cover'>('resume');

  async function handleSession(s: JDSession) {
    setSession(s);
    setMatch(null);
    setSelectedIds([]);
    setError('');
    setMatching(true);
    try {
      const [entriesRes, matchRes] = await Promise.all([
        fetch('/api/entries').then((r) => r.json() as Promise<Entry[]>),
        fetch('/api/ai/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jdSessionId: s.id }),
        }),
      ]);
      if (!matchRes.ok) {
        setError((await matchRes.text()) || 'Matching failed');
        setEntries(entriesRes);
        return;
      }
      const result: MatchResult = await matchRes.json();
      setEntries(entriesRes);
      setMatch(result);
      // pre-select all matched entries
      setSelectedIds(result.matches.map((m) => m.entryId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Matching failed');
    } finally {
      setMatching(false);
    }
  }

  function reset() {
    setSession(null);
    setMatch(null);
    setEntries([]);
    setSelectedIds([]);
    setError('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Output</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Upload a JD, pick the evidence that fits, and generate a tailored résumé.
          </p>
        </div>
        {session && (
          <button
            onClick={reset}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:border-foreground/40 dark:border-white/20"
          >
            New JD
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
        <StepBadge n={1} label="Job description" active={!session} done={!!session} />
        <StepBadge n={2} label="Select evidence" active={!!session} done={selectedIds.length > 0} />
        <StepBadge n={3} label="Résumé" active={selectedIds.length > 0} done={false} />
      </div>

      {!session ? (
        <JDUploader onSessionCreated={handleSession} />
      ) : (
        <div className="space-y-6">
          <DigestView session={session} />

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
              {error}
            </p>
          )}

          {matching ? (
            <p className="text-sm text-foreground/50">Matching your Story Bank against this role…</p>
          ) : match ? (
            <>
              <EntrySelector
                match={match}
                entries={entries}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />

              <div className="border-t border-black/10 pt-6 dark:border-white/15">
                <div className="mb-3 flex items-center gap-1 text-sm">
                  {(['resume', 'cover'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOutputTab(t)}
                      className={`rounded-md px-3 py-1.5 ${
                        outputTab === t
                          ? 'bg-black/[.06] font-medium dark:bg-white/10'
                          : 'text-foreground/60'
                      }`}
                    >
                      {t === 'resume' ? 'Résumé' : 'Cover letter'}
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-foreground/45">
                    {selectedIds.length} selected
                  </span>
                </div>

                {outputTab === 'resume' ? (
                  <>
                    <p className="mb-3 text-xs text-foreground/50">
                      Built only from your selected evidence — no upgraded verbs, no invented metrics.
                    </p>
                    <ResumePreview jdSessionId={session.id} selectedEntryIds={selectedIds} />
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-foreground/50">
                      Add the company (optionally let AI research it), then generate a grounded cover
                      letter.
                    </p>
                    <CoverLetterPanel
                      jdSessionId={session.id}
                      selectedEntryIds={selectedIds}
                      roleHint={session.digest.summary || session.filename}
                    />
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      <section className="border-t border-black/10 pt-8 dark:border-white/15">
        <h2 className="text-lg font-semibold tracking-tight">Career exploration</h2>
        <p className="mb-3 mt-1 text-sm text-foreground/60">
          A strategic chat that knows your whole profile — skill-gap analysis and path planning,
          grounded in your actual evidence.
        </p>
        <CareerChat />
      </section>
    </div>
  );
}
