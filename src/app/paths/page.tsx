'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';
import type { JDSession } from '@/types';

interface SavedPlan {
  id: string;
  targetRole: string;
  content: string;
  createdAt: number;
}

const btn =
  'rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40';
const btnGhost =
  'rounded-md border border-black/15 px-3 py-2 text-sm hover:border-foreground/40 disabled:opacity-40 dark:border-white/20';
const inputCls =
  'rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20';

function StreamBox({ text, loading }: { text: string; loading: boolean }) {
  if (!text && !loading) return null;
  return (
    <div className="prose-vantage mt-3 rounded-lg border border-black/10 p-5 text-sm dark:border-white/15">
      {text ? <ReactMarkdown>{text}</ReactMarkdown> : <p className="text-foreground/40">Streaming…</p>}
    </div>
  );
}

export default function PathsPage() {
  const [canSearch, setCanSearch] = useState(false);
  const [sessions, setSessions] = useState<JDSession[]>([]);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [error, setError] = useState('');

  // per-section state
  const [positioning, setPositioning] = useState('');
  const [posLoading, setPosLoading] = useState(false);
  const [adjacent, setAdjacent] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjSearch, setAdjSearch] = useState(false);
  const [roadmap, setRoadmap] = useState('');
  const [rmLoading, setRmLoading] = useState(false);
  const [target, setTarget] = useState('');
  const [rmJd, setRmJd] = useState('');
  const [rmSearch, setRmSearch] = useState(true);
  const [rmSaved, setRmSaved] = useState(false);

  useEffect(() => {
    fetch('/api/ai/capabilities').then((r) => r.json()).then((c) => setCanSearch(!!c.webSearch)).catch(() => {});
    fetch('/api/jd-sessions').then((r) => r.json()).then(setSessions).catch(() => {});
    fetch('/api/path-plans').then((r) => r.json()).then(setPlans).catch(() => {});
    // Latest persisted analyses (in-app or agent-written) survive reloads.
    fetch('/api/analyses?kind=positioning&latest=1')
      .then((r) => r.json())
      .then((a) => a && setPositioning(a.content))
      .catch(() => {});
    fetch('/api/analyses?kind=adjacent&latest=1')
      .then((r) => r.json())
      .then((a) => a && setAdjacent(a.content))
      .catch(() => {});
  }, []);

  async function run(
    body: Record<string, unknown>,
    setText: (s: string) => void,
    setLoading: (b: boolean) => void,
    persistKind?: 'positioning' | 'adjacent',
  ) {
    setLoading(true);
    setError('');
    setText('');
    try {
      const res = await fetch('/api/ai/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status})`);
        return;
      }
      const full = await readTextStream(res, setText);
      if (persistKind && full.trim()) {
        fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: persistKind, content: full, source: 'app' }),
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    const res = await fetch('/api/path-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole: target, content: roadmap }),
    });
    if (res.ok) {
      const created = await res.json();
      setPlans((prev) => [created, ...prev]);
      setRmSaved(true);
      setTimeout(() => setRmSaved(false), 1500);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this saved roadmap?')) return;
    await fetch(`/api/path-plans/${id}`, { method: 'DELETE' });
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  // Guided flow: suggest the next step without gating anything.
  const nextStep = !positioning ? 1 : !adjacent ? 2 : plans.length === 0 && !roadmap ? 3 : 0;
  const stepBadge = (step: number, done: boolean) =>
    done ? (
      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        ✓ done
      </span>
    ) : nextStep === step ? (
      <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
        suggested next
      </span>
    ) : null;

  const searchToggle = (checked: boolean, onChange: (b: boolean) => void) => (
    <label
      className={`flex items-center gap-1.5 text-xs ${canSearch ? 'text-foreground/60' : 'text-foreground/30'}`}
      title={canSearch ? '' : 'The current AI provider cannot search the web'}
    >
      <input type="checkbox" checked={canSearch && checked} disabled={!canSearch} onChange={(e) => onChange(e.target.checked)} />
      Live market research
    </label>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paths</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Strategy from your skill portfolio — where you stand, where a similar composition can go,
          and how to build toward a target. Market data is reference, not a mold.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>
      )}

      {/* 1. Positioning */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              1 · Where you stand {stepBadge(1, !!positioning)}
            </h2>
            <p className="mt-0.5 text-xs text-foreground/50">
              What your current composition says — center of gravity, distinctive combinations, evidence strength.
            </p>
          </div>
          <button
            className={btn}
            disabled={posLoading}
            onClick={() => run({ mode: 'positioning' }, setPositioning, setPosLoading, 'positioning')}
          >
            {posLoading ? 'Analyzing…' : positioning ? 'Re-run' : 'Analyze'}
          </button>
        </div>
        <StreamBox text={positioning} loading={posLoading} />
      </section>

      {/* 2. Adjacent paths */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium">
              2 · Adjacent paths {stepBadge(2, !!adjacent)}
            </h2>
            <p className="mt-0.5 text-xs text-foreground/50">
              Directions reachable with a composition like yours — including ones you haven&apos;t considered.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {searchToggle(adjSearch, setAdjSearch)}
            <button
              className={btn}
              disabled={adjLoading}
              onClick={() =>
                run({ mode: 'adjacent', useWebSearch: adjSearch }, setAdjacent, setAdjLoading, 'adjacent')
              }
            >
              {adjLoading ? 'Mapping…' : adjacent ? 'Re-run' : 'Map paths'}
            </button>
          </div>
        </div>
        <StreamBox text={adjacent} loading={adjLoading} />
      </section>

      {/* 3. Roadmap */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium">
          3 · Build toward a target {stepBadge(3, plans.length > 0 || !!roadmap)}
        </h2>
        <p className="mt-0.5 text-xs text-foreground/50">
          Gap analysis and a staged build order — each step produces evidence for your Story Bank.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-64`}
            placeholder="Target direction (e.g. AI hardware architect)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          {sessions.length > 0 && (
            <select className={inputCls} value={rmJd} onChange={(e) => setRmJd(e.target.value)}>
              <option value="">No JD reference</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  JD: {s.filename || s.digest.summary.slice(0, 40)}
                </option>
              ))}
            </select>
          )}
          {searchToggle(rmSearch, setRmSearch)}
          <button
            className={btn}
            disabled={rmLoading || !target.trim()}
            onClick={() =>
              run(
                { mode: 'roadmap', target, jdSessionId: rmJd || undefined, useWebSearch: rmSearch },
                setRoadmap,
                setRmLoading,
              )
            }
          >
            {rmLoading ? 'Planning…' : roadmap ? 'Re-plan' : 'Plan roadmap'}
          </button>
          {roadmap && !rmLoading && (
            <button className={btnGhost} onClick={savePlan}>
              {rmSaved ? 'Saved ✓' : 'Save roadmap'}
            </button>
          )}
        </div>
        <StreamBox text={roadmap} loading={rmLoading} />
      </section>

      {/* Saved plans */}
      {plans.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">Saved roadmaps</h2>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id} className="rounded-lg border border-black/10 dark:border-white/15">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium">{p.targetRole || 'Untitled target'}</span>
                    <span className="flex items-center gap-3 text-xs text-foreground/45">
                      {new Date(p.createdAt).toLocaleDateString()}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deletePlan(p.id);
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </span>
                  </summary>
                  <div className="prose-vantage border-t border-black/[.06] p-5 text-sm dark:border-white/10">
                    <ReactMarkdown>{p.content}</ReactMarkdown>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
