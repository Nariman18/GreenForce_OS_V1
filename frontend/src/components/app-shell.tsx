'use client';

import { FolderKanban, LogOut, Menu, Plus, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useHealth, useLogout, useMe, useResetDemo } from '@/lib/queries';
import { useUiStore } from '@/store/ui-store';
import { Logo } from './logo';
import { Badge } from './ui/badge';
import { Button, ButtonLink } from './ui/button';

function ResetDemoButton() {
  const reset = useResetDemo();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        icon={<RotateCcw className="size-4" aria-hidden />}
        onClick={() => setConfirming(true)}
      >
        Reset demo
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900 ring-1 ring-amber-200">
      Restore seeded data?
      <Button
        size="sm"
        variant="secondary"
        loading={reset.isPending}
        onClick={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              router.push('/');
            },
          })
        }
      >
        Reset
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useMe();
  const { data: health } = useHealth();
  const logout = useLogout();
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);

  useEffect(() => setMobileNavOpen(false), [pathname, setMobileNavOpen]);

  const signOut = () => logout.mutate(undefined, { onSettled: () => router.replace('/login') });
  const projectsActive = pathname === '/' || pathname.startsWith('/projects/');

  const actions = (
    <>
      {health?.demoMode && <ResetDemoButton />}
      {user && (
        <div className="flex items-center gap-3 border-line md:border-l md:pl-3">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted">{user.organization}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            loading={logout.isPending}
            aria-label="Sign out"
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="GreenForce OS home">
            <Logo />
          </Link>
          {health?.demoMode && (
            <Badge tone="warning" className="hidden sm:inline-flex">
              Demo environment
            </Badge>
          )}
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
            <Link
              href="/"
              aria-current={projectsActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                projectsActive ? 'bg-pine-50 text-pine-800' : 'text-muted hover:text-ink',
              )}
            >
              <FolderKanban className="size-4" aria-hidden />
              Projects
            </Link>
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <ButtonLink href="/projects/new" size="sm" icon={<Plus className="size-4" aria-hidden />}>
              New project
            </ButtonLink>
            {actions}
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-muted hover:bg-stone-100 md:hidden"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="space-y-3 border-t border-line px-4 py-4 md:hidden">
            <ButtonLink
              href="/"
              variant="secondary"
              className="w-full"
              icon={<FolderKanban className="size-4" aria-hidden />}
            >
              Projects
            </ButtonLink>
            <ButtonLink
              href="/projects/new"
              className="w-full"
              icon={<Plus className="size-4" aria-hidden />}
            >
              New project
            </ButtonLink>
            <div className="flex flex-wrap items-center justify-between gap-3">{actions}</div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="no-print border-t border-line py-5 text-center text-xs text-muted">
        GreenForce OS MVP
      </footer>
    </div>
  );
}
