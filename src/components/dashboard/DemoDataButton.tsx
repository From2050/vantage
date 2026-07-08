'use client';

import { useState } from 'react';

// Shown only on an empty dashboard: one click populates a fictional demo profile
// so a first-time user immediately sees the app working.
export default function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (!res.ok) {
        setError((await res.text()) || 'Failed to load demo data');
        return;
      }
      window.location.reload();
    } catch {
      setError('Failed to load demo data');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={load}
        disabled={loading}
        className="rounded-full bg-[var(--accent)] px-3 py-1.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Loading…' : '✨ Try with demo data'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </>
  );
}
