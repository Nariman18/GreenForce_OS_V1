import {
  type ComputedCheck,
  type Criterion,
  RULE_CATEGORY_LABELS,
  type RuleEvaluation,
} from '@greenforce/shared';
import { ArrowRight, BookOpen, CheckCircle2, CircleHelp, Lightbulb, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { VerdictBadge } from './verdict-badge';

function CheckPanel({ check }: { check: ComputedCheck }) {
  const tone =
    check.status === 'PASS'
      ? 'border-emerald-200 bg-emerald-50/60'
      : check.status === 'FAIL'
        ? 'border-rose-200 bg-rose-50/60'
        : 'border-line bg-stone-50';
  const symbol = check.comparator === 'lte' ? '≤' : check.comparator === 'gte' ? '≥' : '';
  return (
    <div className={cn('rounded-lg border px-4 py-3', tone)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Computed check · {check.label}</p>
        {check.limit !== null && check.unit && (
          <p className="text-sm tabular-nums">
            <span className="font-semibold">
              {check.measured === null ? '—' : formatNumber(check.measured, 2)}
            </span>
            <span className="text-muted">
              {' '}
              / limit {symbol} {formatNumber(check.limit, 2)} {check.unit}
            </span>
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{check.explanation}</p>
    </div>
  );
}

const CRITERION_ICON: Record<Criterion['status'], typeof CheckCircle2> = {
  MET: CheckCircle2,
  NOT_MET: XCircle,
  UNKNOWN: CircleHelp,
};

export function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return (
    <ul className="space-y-1.5">
      {criteria.map((criterion) => {
        const Icon = CRITERION_ICON[criterion.status];
        return (
          <li key={criterion.label} className="flex items-start gap-2 text-sm">
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                criterion.status === 'MET' && 'text-emerald-600',
                criterion.status === 'NOT_MET' && 'text-rose-600',
                criterion.status === 'UNKNOWN' && 'text-stone-400',
              )}
              aria-label={criterion.status.replace('_', ' ').toLowerCase()}
            />
            <span>
              <span className="font-medium">{criterion.label}</span>
              <span className="text-muted"> — {criterion.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RuleCard({
  rule,
  projectId,
  showDetails,
}: {
  rule: RuleEvaluation;
  projectId: string;
  showDetails: boolean;
}) {
  const setAside = rule.applicability === 'SET_ASIDE';
  const provided = rule.evidence.filter((entry) => entry.status !== 'MISSING').length;

  return (
    <Card id={rule.ruleId} className={cn('scroll-mt-24 p-5', setAside && 'bg-stone-50/70 shadow-none')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-muted">{rule.code}</span>
            <Badge tone="outline">{RULE_CATEGORY_LABELS[rule.category]}</Badge>
          </div>
          <h3 className={cn('font-semibold', setAside && 'text-muted')}>{rule.title}</h3>
        </div>
        <VerdictBadge verdict={rule.verdict} />
      </div>

      {showDetails && <p className="mt-2 text-sm text-muted">{rule.requirement}</p>}

      <p className="mt-3 text-sm">
        <span className="font-medium">
          {setAside
            ? 'Why it is set aside: '
            : rule.applicability === 'UNDECIDED'
              ? 'Why it is undecided: '
              : 'Why it applies: '}
        </span>
        {rule.reason}
      </p>

      {(rule.check || rule.criteria.length > 0 || rule.evidence.length > 0) && (
        <div className="mt-4 space-y-3">
          {rule.check && <CheckPanel check={rule.check} />}
          {rule.criteria.length > 0 && <CriteriaList criteria={rule.criteria} />}
          {rule.evidence.length > 0 && (
            <Link
              href={`/projects/${projectId}/evidence#${rule.ruleId}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-stone-50"
            >
              <span>
                Evidence: <span className="font-medium">{provided}</span> of {rule.evidence.length} provided
              </span>
              <ArrowRight className="size-4 text-muted" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {rule.nextAction && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          {rule.nextAction}
        </p>
      )}

      {showDetails && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
          <BookOpen className="mt-px size-3.5 shrink-0" aria-hidden />
          {rule.citation}
        </p>
      )}
    </Card>
  );
}
