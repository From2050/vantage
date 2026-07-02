'use client';

import { useEffect, useState } from 'react';
import { btnPrimary, btnSecondary, card, errorBox, input, pageTitle, subtext } from '@/components/ui';

type PresetKind = 'gemini' | 'ollama' | 'openai-compat';

interface CurrentConfig {
  provider: 'gemini' | 'openai-compat';
  apiKeyMasked: string;
  hasKey: boolean;
  baseUrl: string;
  model: string;
  tier: 'strong' | 'basic';
}

const PRESETS: {
  kind: PresetKind;
  title: string;
  desc: string;
  badge: string;
}[] = [
  {
    kind: 'gemini',
    title: 'Google Gemini',
    desc: 'Cloud API. Full features including live web research. Get a free key at aistudio.google.com.',
    badge: 'web search',
  },
  {
    kind: 'ollama',
    title: 'Ollama (local)',
    desc: 'Runs entirely on your machine — your data never leaves. Requires Ollama running locally.',
    badge: 'private',
  },
  {
    kind: 'openai-compat',
    title: 'OpenAI-compatible',
    desc: 'Any /v1/chat/completions endpoint with a Bearer token: OpenRouter, OpenAI, LM Studio, vLLM…',
    badge: 'bring your own',
  },
];

export default function SettingsPage() {
  const [current, setCurrent] = useState<CurrentConfig | null>(null);
  const [open, setOpen] = useState<PresetKind | null>(null);
  const [loading, setLoading] = useState(true);

  // form state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [tier, setTier] = useState<'strong' | 'basic'>('basic');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaErr, setOllamaErr] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  function refresh() {
    return fetch('/api/settings')
      .then((r) => r.json())
      .then(setCurrent);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function openPreset(kind: PresetKind) {
    setOpen(kind);
    setSaveErr('');
    setTestResult('');
    setApiKey('');
    if (kind === 'gemini') {
      setModel(current?.provider === 'gemini' ? current.model : 'gemini-2.5-flash');
    } else if (kind === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModel('');
      setOllamaErr('');
      setOllamaModels([]);
      const res = await fetch('/api/settings/ollama-models?baseUrl=http://localhost:11434').then((r) => r.json());
      if (res.models?.length) {
        setOllamaModels(res.models);
        setModel(res.models[0]);
      } else {
        setOllamaErr(res.error || 'No models found — pull one first (e.g. `ollama pull llama3.2`)');
      }
    } else {
      setBaseUrl(current?.provider === 'openai-compat' ? current.baseUrl : '');
      setModel(current?.provider === 'openai-compat' ? current.model : '');
      setTier(current?.tier ?? 'basic');
    }
  }

  async function save() {
    if (!open) return;
    setSaving(true);
    setSaveErr('');
    setTestResult('');
    try {
      const provider = open === 'gemini' ? 'gemini' : 'openai-compat';
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          baseUrl: open === 'gemini' ? '' : baseUrl,
          model,
          tier: open === 'gemini' ? 'strong' : tier,
        }),
      });
      if (!res.ok) {
        setSaveErr((await res.text()) || 'Save failed');
        return;
      }
      await refresh();
      await test();
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult('');
    try {
      const r = await fetch('/api/settings/test', { method: 'POST' }).then((x) => x.json());
      setTestResult(r.ok ? `✓ Connected to ${r.provider} (${r.ms}ms)` : `✗ ${r.error}`);
    } catch {
      setTestResult('✗ Test failed');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <p className={subtext}>Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className={pageTitle}>Settings</h1>
        <p className={`mt-1 ${subtext}`}>
          Choose the AI model that powers analysis. Keys are stored only in your local database —
          they never leave this machine except to call your chosen provider.
        </p>
      </div>

      {/* Current provider */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Active provider</div>
            {current ? (
              <p className="mt-1 text-sm text-foreground/60">
                {current.provider === 'gemini' ? 'Google Gemini' : current.baseUrl} · model{' '}
                <span className="font-mono text-xs">{current.model}</span>
                {current.hasKey && <> · key {current.apiKeyMasked}</>}
              </p>
            ) : (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Not configured — pick a provider below to enable AI features.
              </p>
            )}
          </div>
          {current && (
            <button onClick={test} disabled={testing} className={btnSecondary}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          )}
        </div>
        {testResult && (
          <p
            className={`mt-3 text-sm ${testResult.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {testResult}
          </p>
        )}
      </div>

      {/* Preset cards */}
      <div className="space-y-3">
        {PRESETS.map((p) => {
          const isOpen = open === p.kind;
          return (
            <div key={p.kind} className={card}>
              <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => openPreset(isOpen ? p.kind : p.kind)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.title}</span>
                    <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      {p.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">{p.desc}</p>
                </div>
                <span className="text-foreground/40">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-black/[.06] pt-4 dark:border-white/10">
                  {p.kind === 'gemini' && (
                    <>
                      <Field label="API key">
                        <input
                          className={input}
                          type="password"
                          placeholder={current?.provider === 'gemini' && current.hasKey ? `Saved (${current.apiKeyMasked}) — leave empty to keep` : 'AIza… or AQ.…'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </Field>
                      <Field label="Model">
                        <select className={input} value={model} onChange={(e) => setModel(e.target.value)}>
                          <option value="gemini-2.5-flash">gemini-2.5-flash (fast, cheap)</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro (highest quality)</option>
                        </select>
                      </Field>
                    </>
                  )}

                  {p.kind === 'ollama' && (
                    <>
                      <Field label="Base URL">
                        <input className={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                      </Field>
                      <Field label="Model">
                        {ollamaModels.length > 0 ? (
                          <select className={input} value={model} onChange={(e) => setModel(e.target.value)}>
                            {ollamaModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input className={input} placeholder="llama3.2" value={model} onChange={(e) => setModel(e.target.value)} />
                        )}
                      </Field>
                      {ollamaErr && <p className="text-xs text-amber-600 dark:text-amber-400">{ollamaErr}</p>}
                      <TierPicker tier={tier} setTier={setTier} />
                    </>
                  )}

                  {p.kind === 'openai-compat' && (
                    <>
                      <Field label="Base URL">
                        <input
                          className={input}
                          placeholder="https://openrouter.ai/api/v1"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                        />
                      </Field>
                      <Field label="API key / Bearer token">
                        <input
                          className={input}
                          type="password"
                          placeholder={current?.provider === 'openai-compat' && current.hasKey ? `Saved (${current.apiKeyMasked}) — leave empty to keep` : 'sk-… (optional for local servers)'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </Field>
                      <Field label="Model">
                        <input className={input} placeholder="e.g. openai/gpt-4o-mini" value={model} onChange={(e) => setModel(e.target.value)} />
                      </Field>
                      <TierPicker tier={tier} setTier={setTier} />
                    </>
                  )}

                  {saveErr && <p className={errorBox}>{saveErr}</p>}
                  <button onClick={save} disabled={saving} className={btnPrimary}>
                    {saving ? 'Saving…' : 'Save & test'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-foreground/40">
        Note: web-grounded features (company research, live market data) require a provider with web
        search — currently Gemini. Other features degrade gracefully.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground/70">{label}</label>
      {children}
    </div>
  );
}

function TierPicker({ tier, setTier }: { tier: 'strong' | 'basic'; setTier: (t: 'strong' | 'basic') => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground/70">Model capability</label>
      <div className="flex gap-2 text-sm">
        {(['basic', 'strong'] as const).map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-xs text-foreground/70">
            <input type="radio" checked={tier === t} onChange={() => setTier(t)} />
            {t === 'basic' ? 'Basic (small local models — finer task splitting)' : 'Strong (GPT-4-class)'}
          </label>
        ))}
      </div>
    </div>
  );
}
