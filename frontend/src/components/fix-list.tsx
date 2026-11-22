import type { FixItem } from '@greenforce/shared';
import { ArrowRight, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { VerdictBadge } from './verdict-badge';

/** Where each kind of action is resolved in the workflow. */
function targetFor(projectId: string, item: FixItem): string {
  const base = `/projects/${projectId}`;
  if (item.verdict === 'PROOF_MISSING' || item.verdict === 'PROOF_IN_PROGRESS')
    return `${base}/evidence#${item.ruleId}`;
  if (item.verdict === 'CANT_DECIDE' || item.action.includes('Setup')) return `${base}/setup`;
  return `${base}/requirements#${item.ruleId}`;
}

export function FixList({
  projectId,
  items,
  limit,
}: {
  projectId: string;
  items: FixItem[];
  limit?: number;
}) {
  if (!items.length) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-pine-50 px-4 py-3 text-sm text-pine-800">
        <PartyPopper className="size-4" aria-hidden /> Nothing to fix — every applicable rule is resolved and
        proven.
      </p>
    );
  }
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <ol className="divide-y divide-line">
      {shown.map((item) => (
        <li key={item.ruleId}>
          <Link
            href={targetFor(projectId, item)}
            className="group flex items-start gap-3 py-3 text-sm hover:bg-stone-50/70 sm:px-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                <span className="font-mono text-xs text-muted">{item.code}</span>
              </div>
              <p className="mt-1 text-muted">{item.action}</p>
            </div>
            <VerdictBadge verdict={item.verdict} />
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-stone-400 group-hover:text-ink" aria-hidden />
          </Link>
        </li>
      ))}
      {limit && items.length > limit && (
        <li className="pt-3 text-sm">
          <Link
            href={`/projects/${projectId}/requirements`}
            className="font-medium text-pine-700 hover:underline"
          >
            View all {items.length} actions
          </Link>
        </li>
      )}
    </ol>
  );
}
