'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Status {
  entries: number;
  skills: number;
  goalsSet: boolean;
  hasFrameworkAnalysis: boolean;
  resumes: number;
}

interface Step {
  label: string;
  href: string;
  done: (s: Status) => boolean;
}

const STEPS: Step[] = [
  { label: 'Add your experiences', href: '/story-bank', done: (s) => s.entries > 0 },
  { label: 'Extract your skill portfolio', href: '/', done: (s) => s.skills > 0 },
  { label: 'Set goals (and take the interests assessment)', href: '/goals', done: (s) => s.goalsSet },
  { label: 'Run a framework analysis', href: '/paths', done: (s) => s.hasFrameworkAnalysis },
  { label: 'Generate a résumé for a specific job', href: '/output', done: (s) => s.resumes > 0 },
];

// Progress checklist driven by GET /api/status. Reflects work done in the UI OR
// by an agent (docs/agent-playbook.md). Hides itself once everything is done.
export default function GettingStarted() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;
  const done = STEPS.filter((st) => st.done(status)).length;
  if (done === STEPS.length) return null; // all set — get out of the way

  return (
    <div className="rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Getting started</h2>
        <span className="text-xs text-foreground/50">
          {done}/{STEPS.length}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-foreground/55">
        Do these in the UI, or ask your coding agent to “analyze me with Vantage”.
      </p>
      <ul className="mt-3 space-y-1.5">
        {STEPS.map((st) => {
          const isDone = st.done(status);
          return (
            <li key={st.label}>
              <Link
                href={st.href}
                className={`flex items-center gap-2.5 text-sm ${
                  isDone ? 'text-foreground/45' : 'text-foreground/80 hover:text-[var(--accent)]'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-black/25 dark:border-white/30'
                  }`}
                >
                  {isDone ? '✓' : ''}
                </span>
                <span className={isDone ? 'line-through' : ''}>{st.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
