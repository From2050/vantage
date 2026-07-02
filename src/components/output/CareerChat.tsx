'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readTextStream } from '@/lib/ai/readStream';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'What roles suit my current background?',
  'Where are my biggest skill gaps?',
  'What could I build toward in the next 12 months?',
];

export default function CareerChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;
    const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/career-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        const err = (await res.text()) || `Request failed (${res.status})`;
        setMessages([...history, { role: 'assistant', content: `⚠️ ${err}` }]);
        return;
      }
      await readTextStream(res, (full) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: full };
          return copy;
        });
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Request failed';
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${err}` };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      <div className="max-h-[32rem] min-h-40 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground/50">
              Ask about paths, gaps, or plans — answers are grounded in your Story Bank and Goals.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-black/15 px-3 py-1.5 text-xs text-foreground/70 hover:border-foreground/40 dark:border-white/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-foreground px-3 py-2 text-sm text-background">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="prose-vantage max-w-[88%] rounded-2xl rounded-bl-sm bg-black/[.04] px-3 py-2 text-sm dark:bg-white/[.06]">
                  {m.content ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    <span className="text-foreground/40">Thinking…</span>
                  )}
                </div>
              </div>
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/15">
        <textarea
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20"
          rows={1}
          placeholder="Ask a career question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
