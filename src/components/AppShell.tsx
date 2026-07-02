'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';

interface Caps {
  name: string;
  tier?: string;
  webSearch?: boolean;
  error?: string;
}

const NAV = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    ),
  },
  {
    href: '/story-bank',
    label: 'Story Bank',
    icon: (
      <path d="M4 4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm10 0v4h4M8 12h8M8 16h5" />
    ),
  },
  {
    href: '/goals',
    label: 'Goals & Values',
    icon: (
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-3.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
    ),
  },
  {
    href: '/paths',
    label: 'Paths',
    icon: (
      <path d="M4 19c4-1 3-6 7-7s4-5 8-6M4 5h3M17 19h3M4 5l2-2M4 5l2 2M20 19l-2-2m2 2-2 2" />
    ),
  },
  {
    href: '/output',
    label: 'Output',
    icon: (
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 5h6M9 12h6M9 16h4" />
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.5-3a7.5 7.5 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    ),
  },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function ProviderStatus() {
  const [caps, setCaps] = useState<Caps | null>(null);
  useEffect(() => {
    fetch('/api/ai/capabilities')
      .then((r) => r.json())
      .then(setCaps)
      .catch(() => setCaps({ name: 'none', error: 'unreachable' }));
  }, []);

  const ok = caps && !caps.error && caps.name !== 'none';
  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground/55 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      title={ok ? `Provider: ${caps.name} (${caps.tier}${caps.webSearch ? ', web search' : ''})` : 'No AI provider configured — click to set up'}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      <span className="truncate">
        {caps === null ? '…' : ok ? `AI: ${caps.name}` : 'AI: not configured'}
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-2">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setDrawerOpen(false)}
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive(item.href)
              ? 'bg-[var(--accent)]/10 font-medium text-[var(--accent)]'
              : 'text-foreground/65 hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]'
          }`}
        >
          <NavIcon>{item.icon}</NavIcon>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-black/[.07] bg-surface py-4 dark:border-white/10 lg:flex">
        <Link href="/" className="mb-5 flex items-center gap-2 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
            V
          </span>
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        {nav}
        <div className="mt-auto px-2 pt-2">
          <ProviderStatus />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-black/[.07] bg-background/85 px-4 py-3 backdrop-blur-md dark:border-white/10 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-white">
            V
          </span>
          <span className="text-sm font-semibold">{APP_NAME}</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Toggle navigation"
          className="rounded-md p-1.5 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {drawerOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-10 bg-background pt-16 lg:hidden">
          {nav}
          <div className="px-2 pt-2">
            <ProviderStatus />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="min-w-0 flex-1 px-5 py-8 pt-20 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
