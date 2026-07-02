import type { EntryType } from '@/types';

// Minimal monochrome: a neutral pill for every type, differentiated by intensity.
const SOLID = 'bg-foreground/[.08] text-foreground/80 dark:bg-white/15';
const SUBTLE = 'border border-black/15 text-foreground/65 dark:border-white/25';

export const ENTRY_TYPE_META: Record<EntryType, { label: string; badge: string }> = {
  work: { label: 'Work', badge: SOLID },
  education: { label: 'Education', badge: SUBTLE },
  project: { label: 'Project', badge: SOLID },
  activity: { label: 'Activity', badge: SUBTLE },
};

export function formatDateRange(dateFrom: string, dateTo: string): string {
  const to = dateTo === 'present' ? 'Present' : dateTo;
  if (!dateFrom && !to) return '';
  if (!to) return dateFrom;
  if (!dateFrom) return to;
  return `${dateFrom} – ${to}`;
}
