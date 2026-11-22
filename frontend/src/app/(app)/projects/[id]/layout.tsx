'use client';

import { JURISDICTION_LABELS } from '@greenforce/shared';
import { ArrowLeft, Fingerprint, MapPin, Scale } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, PageSkeleton } from '@/components/ui/feedback';
import { Ring } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { useCompliance, useProject } from '@/lib/queries';
import { useProjectId } from './project-context';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const id = useProjectId();
  const pathname = usePathname();
  const project = useProject(id);
  const compliance = useCompliance(id);
  const navRef = useRef<HTMLElement>(null);

  // Keep the active step visible when the tab strip scrolls horizontally (mobile).
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname, project.isSuccess]);

  if (project.isPending) return <PageSkeleton />;
  if (project.isError) {
    return (
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Projects
        </Link>
        <ErrorState error={project.error} onRetry={() => project.refetch()} />
      </div>
    );
  }

  const result = compliance.data;
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: 'Property', step: 1 },
    { href: `${base}/setup`, label: 'Setup', step: 2 },
    { href: `${base}/requirements`, label: 'Requirements', step: 3, count: result?.fixList.length },
    {
      href: `${base}/evidence`,
      label: 'Evidence',
      step: 4,
      meta: result ? `${result.readiness.proofIn.done}/${result.readiness.proofIn.total}` : undefined,
    },
    { href: `${base}/materials`, label: 'Materials & suppliers', step: 5 },
    { href: `${base}/funding`, label: 'Funding', step: 6 },
    { href: `${base}/passport`, label: 'Passport', step: 7 },
  ];
  const { property } = project.data;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Projects
        </Link>
      </div>

      <Card className="no-print overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{JURISDICTION_LABELS[project.data.jurisdiction]}</Badge>
              <Badge tone="neutral" icon={<Fingerprint className="size-3.5" aria-hidden />}>
                <span className="font-mono">{property.greenforceId}</span>
              </Badge>
              {result?.edition ? (
                <Badge tone="outline" icon={<Scale className="size-3.5" aria-hidden />}>
                  {result.edition.name}
                </Badge>
              ) : (
                result && <Badge tone="warning">Edition not resolved</Badge>
              )}
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.data.name}</h1>
            <p className="mt-1 flex items-start gap-1 text-sm text-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {property.address} · parcel {property.parcelId}
            </p>
          </div>
          {result && (
            <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
              <Ring value={result.readiness.overall} size={72} label="Readiness" />
              <span className="text-xs text-muted">Compliance readiness</span>
            </div>
          )}
        </div>
        <nav
          ref={navRef}
          aria-label="Project workflow"
          className="overflow-x-auto border-t border-line bg-stone-50/60"
        >
          <ul className="flex min-w-max px-2">
            {tabs.map((tab) => {
              const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-pine-600 text-pine-800'
                        : 'border-transparent text-muted hover:text-ink',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 place-items-center rounded-full text-[11px]',
                        active ? 'bg-pine-700 text-white' : 'bg-stone-200 text-stone-600',
                      )}
                    >
                      {tab.step}
                    </span>
                    {tab.label}
                    {tab.count ? (
                      <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-900">
                        {tab.count}
                      </span>
                    ) : null}
                    {tab.meta && <span className="text-xs font-normal text-muted">{tab.meta}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Card>

      {children}
    </div>
  );
}
