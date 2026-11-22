'use client';

import type { RuleEvaluation } from '@greenforce/shared';
import { Scale } from 'lucide-react';
import { FixList } from '@/components/fix-list';
import { RuleCard } from '@/components/rule-card';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/feedback';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useCompliance } from '@/lib/queries';
import { type RequirementsFilter, useUiStore } from '@/store/ui-store';
import { useProjectId } from '../project-context';

const ACTION_VERDICTS = new Set(['FAILS', 'CANT_DECIDE', 'PROOF_MISSING', 'PROOF_IN_PROGRESS']);

const FILTERS: { value: RequirementsFilter; label: string; match: (rule: RuleEvaluation) => boolean }[] = [
  { value: 'all', label: 'All rules checked', match: () => true },
  {
    value: 'action',
    label: 'Needs action',
    match: (rule) => rule.verdict !== null && ACTION_VERDICTS.has(rule.verdict),
  },
  { value: 'applies', label: 'Applies', match: (rule) => rule.applicability === 'APPLIES' },
  { value: 'set-aside', label: 'Set aside', match: (rule) => rule.applicability === 'SET_ASIDE' },
];

export default function RequirementsPage() {
  const id = useProjectId();
  const compliance = useCompliance(id);
  const filter = useUiStore((state) => state.requirementsFilter);
  const setFilter = useUiStore((state) => state.setRequirementsFilter);
  const showDetails = useUiStore((state) => state.showRuleDetails);
  const toggleDetails = useUiStore((state) => state.toggleRuleDetails);

  if (compliance.isPending) return <PageSkeleton />;
  if (compliance.isError) return <ErrorState error={compliance.error} onRetry={() => compliance.refetch()} />;

  const result = compliance.data;
  const active = FILTERS.find((entry) => entry.value === filter) ?? FILTERS[0]!;
  const rules = result.rules.filter(active.match);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pine-50 text-pine-700">
              <Scale className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Regulatory edition in force
              </p>
              {result.edition ? (
                <>
                  <p className="font-semibold">{result.edition.name}</p>
                  <p className="text-sm text-muted">
                    Resolved from the {result.edition.basisLabel.toLowerCase()}{' '}
                    {formatDate(result.edition.basisDate)} · effective{' '}
                    {formatDate(result.edition.effectiveFrom)}
                    {result.edition.effectiveTo ? ` – ${formatDate(result.edition.effectiveTo)}` : ' onwards'}
                  </p>
                </>
              ) : (
                <p className="font-medium text-amber-800">{result.editionNote}</p>
              )}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Rules checked', result.summary.checked],
              ['Rules that apply', result.summary.applies],
              ['Rules set aside', result.summary.setAside],
              ["Can't decide yet", result.summary.undecided],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-stone-50 px-3 py-2">
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                <dt className="text-xs text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filter rules" className="flex flex-wrap gap-1">
            {FILTERS.map((entry) => {
              const count = result.rules.filter(entry.match).length;
              return (
                <button
                  key={entry.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === entry.value}
                  onClick={() => setFilter(entry.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors',
                    filter === entry.value
                      ? 'bg-pine-700 text-white ring-pine-700'
                      : 'bg-surface text-muted ring-line hover:text-ink',
                  )}
                >
                  {entry.label} <span className="tabular-nums opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={toggleDetails}
              className="size-4 accent-pine-700"
            />
            Show requirement text & citations
          </label>
        </div>

        {rules.length === 0 ? (
          <EmptyState
            title="No rules in this view"
            description="Choose another filter to see the remaining rules."
          />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard key={rule.ruleId} rule={rule} projectId={id} showDetails={showDetails} />
            ))}
          </div>
        )}
        <p className="text-xs text-muted">{result.disclaimer}</p>
      </div>

      <aside className="min-w-0">
        <Card className="xl:sticky xl:top-24">
          <CardHeader
            title="What do I need to fix?"
            description="Instead of “where do I find the regulation?”"
          />
          <CardBody>
            <FixList projectId={id} items={result.fixList} />
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
