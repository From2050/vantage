'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '@/types';
import { USER_ID } from '@/lib/constants';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY: Profile = {
  id: USER_ID,
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  links: [],
  updatedAt: 0,
};

const field =
  'w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20';

export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [linksText, setLinksText] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d: Profile | null) => {
        const v = d ?? EMPTY;
        setP(v);
        setLinksText(v.links.join('\n'));
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (partial: Partial<Profile>) => {
    setStatus('saving');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error();
      setP(await res.json());
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setP((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading || !p) return <p className="text-sm text-foreground/50">Loading…</p>;

  const textFields: { key: 'fullName' | 'headline' | 'email' | 'phone' | 'location'; label: string; placeholder: string }[] = [
    { key: 'fullName', label: 'Full name', placeholder: 'Your name' },
    { key: 'headline', label: 'Headline', placeholder: 'e.g. Senior Logic Engineer' },
    { key: 'email', label: 'Email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', placeholder: '+886 …' },
    { key: 'location', label: 'Location', placeholder: 'Taipei, Taiwan' },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Contact details used in your résumé header and cover letters.
          </p>
        </div>
        <span className="text-xs text-foreground/50">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved'}
          {status === 'error' && <span className="text-red-500">Save failed</span>}
        </span>
      </div>

      <div className="grid gap-4">
        {textFields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium">{f.label}</label>
            <input
              className={field}
              value={p[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              onBlur={() => save({ [f.key]: p[f.key] })}
            />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm font-medium">Links</label>
          <p className="mb-1 text-xs text-foreground/50">One per line (GitHub, LinkedIn, portfolio…).</p>
          <textarea
            className={`${field} min-h-24 resize-y`}
            value={linksText}
            placeholder={'github.com/you\nlinkedin.com/in/you'}
            onChange={(e) => setLinksText(e.target.value)}
            onBlur={() =>
              save({ links: linksText.split('\n').map((s) => s.trim()).filter(Boolean) })
            }
          />
        </div>
      </div>
    </div>
  );
}
