'use client';

import { useCallback, useEffect, useState } from 'react';
import GoalsEditor from '@/components/goals/GoalsEditor';
import AIExplorerPanel from '@/components/goals/AIExplorerPanel';
import type { GoalsDocument } from '@/types';
import { USER_ID } from '@/lib/constants';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY: GoalsDocument = {
  id: USER_ID,
  visionText: '',
  limitsText: '',
  identityText: '',
  aiSummary: '',
  updatedAt: 0,
};

export default function GoalsPage() {
  const [doc, setDoc] = useState<GoalsDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    fetch('/api/goals')
      .then((r) => r.json())
      .then((d: GoalsDocument | null) => setDoc(d ?? EMPTY))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (partial: Partial<GoalsDocument>) => {
    setStatus('saving');
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error('save failed');
      const updated: GoalsDocument = await res.json();
      setDoc(updated);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  function setField(key: 'visionText' | 'limitsText' | 'identityText', value: string) {
    setDoc((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading || !doc) return <p className="text-sm text-foreground/50">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals &amp; Values</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Define what you actually want. The AI explores with you — it never prescribes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GoalsEditor doc={doc} status={status} onField={setField} onSave={save} />
        <div className="lg:sticky lg:top-6 h-fit">
          <AIExplorerPanel
            vision={doc.visionText}
            limits={doc.limitsText}
            identity={doc.identityText}
            savedSummary={doc.aiSummary}
            onSaveSummary={(summary) => save({ aiSummary: summary })}
          />
        </div>
      </div>
    </div>
  );
}
