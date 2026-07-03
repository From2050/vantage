'use client';

import { useState } from 'react';
import RadarChart, { type RadarAxis } from './RadarChart';

// Two lenses on the same portfolio: individual top skills (game-stat feel) and
// category balance (composition shape). Toggle client-side; axes computed server-side.
export default function RadarPanel({
  skillAxes,
  categoryAxes,
}: {
  skillAxes: RadarAxis[];
  categoryAxes: RadarAxis[];
}) {
  const [view, setView] = useState<'skills' | 'categories'>('skills');
  const showToggle = categoryAxes.length >= 3 && skillAxes.length >= 3;
  const axes = view === 'categories' && showToggle ? categoryAxes : skillAxes;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {showToggle && (
        <div className="flex gap-1 rounded-lg bg-black/[.04] p-0.5 text-xs dark:bg-white/[.06]">
          {(
            [
              ['skills', 'Top skills'],
              ['categories', 'Balance'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                view === key
                  ? 'bg-surface font-medium shadow-sm'
                  : 'text-foreground/55 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <RadarChart axes={axes} />
    </div>
  );
}
