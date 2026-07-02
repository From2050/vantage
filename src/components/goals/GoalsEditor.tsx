'use client';

import type { GoalsDocument } from '@/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SECTIONS: {
  key: 'visionText' | 'limitsText' | 'identityText';
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: 'visionText',
    label: 'Ideal life & work',
    hint: 'What does a good life and a good working day actually look like for you?',
    placeholder: 'Environment, pace, kind of problems, people, lifestyle, where you live…',
  },
  {
    key: 'limitsText',
    label: 'Non-negotiables & trade-offs',
    hint: 'Your hard boundaries, and what you are (and are not) willing to sacrifice.',
    placeholder: 'Hours, location, values you won’t compromise, trade-offs you’d accept…',
  },
  {
    key: 'identityText',
    label: 'How I describe myself',
    hint: 'Your own narrative — strengths, what you care about, how you see yourself.',
    placeholder: 'In your own words, who you are and what drives you…',
  },
];

export default function GoalsEditor({
  doc,
  status,
  onField,
  onSave,
}: {
  doc: GoalsDocument;
  status: SaveStatus;
  onField: (key: 'visionText' | 'limitsText' | 'identityText', value: string) => void;
  onSave: (partial: Partial<GoalsDocument>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Your goals & values</h2>
        <span className="text-xs text-foreground/50">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && doc.updatedAt > 0 && `Saved ${new Date(doc.updatedAt).toLocaleTimeString()}`}
          {status === 'error' && <span className="text-red-500">Save failed</span>}
        </span>
      </div>

      {SECTIONS.map((s) => (
        <div key={s.key}>
          <label className="block text-sm font-medium">{s.label}</label>
          <p className="mb-1 text-xs text-foreground/50">{s.hint}</p>
          <textarea
            className="min-h-32 w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50 dark:border-white/20"
            value={doc[s.key]}
            placeholder={s.placeholder}
            onChange={(e) => onField(s.key, e.target.value)}
            onBlur={() => onSave({ [s.key]: doc[s.key] })}
          />
        </div>
      ))}
    </div>
  );
}
