// Shared class constants — the app's component vocabulary. No component library;
// consistency comes from reusing these tokens everywhere.

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/20';

export const btnGhost =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm text-foreground/65 transition-colors hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]';

export const btnDanger =
  'inline-flex items-center justify-center rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10';

export const card =
  'rounded-xl border border-black/10 bg-surface p-5 dark:border-white/10';

export const cardHover =
  'rounded-xl border border-black/10 bg-surface p-5 transition-all hover:border-[var(--accent)]/50 hover:shadow-sm dark:border-white/10';

export const input =
  'w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] dark:border-white/20';

export const badge =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

export const sectionTitle = 'text-sm font-medium';

export const pageTitle = 'text-2xl font-semibold tracking-tight';

export const subtext = 'text-sm text-foreground/55';

export const errorBox =
  'rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400';

// Streaming/loading skeleton shimmer
export const skeleton =
  'animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]';
