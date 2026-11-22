'use client';

import { FUNDING_STATUS_LABELS, type FundingStatus } from '@greenforce/shared';
import { ArrowRight, Banknote, CircleDashed, CircleHelp, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { CriteriaList } from '@/components/rule-card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/feedback';
import { EvidenceStatusBadge } from '@/components/verdict-badge';
import { useCompliance, useFunding, useProjectMaterials } from '@/lib/queries';
import { useProjectId } from '../project-context';

const STATUS_TONE: Record<FundingStatus, BadgeTone> = {
  ELIGIBLE: 'success',
  NOT_ELIGIBLE: 'danger',
  UNDECIDED: 'neutral',
};

type Answer = 'yes' | 'no' | 'open' | 'future';
const ANSWER_ICON: Record<Answer, { Icon: typeof CheckCircle2; className: string }> = {
  yes: { Icon: CheckCircle2, className: 'text-emerald-600' },
  no: { Icon: XCircle, className: 'text-rose-600' },
  open: { Icon: CircleHelp, className: 'text-amber-600' },
  future: { Icon: CircleDashed, className: 'text-stone-400' },
};

/** The brief's six contractor questions, answered from live project state. */
function ContractorQuestions() {
  const id = useProjectId();
  const compliance = useCompliance(id);
  const funding = useFunding(id);
  const materials = useProjectMaterials(id);
  if (!compliance.data) return null;
  const { summary, readiness } = compliance.data;
  const fails = summary.verdictCounts.FAILS;
  const selected = materials.data?.recommendations.filter((entry) => entry.selected) ?? [];
  const programs = funding.data?.programs ?? [];

  const rows: { question: string; answer: Answer; detail: string }[] = [
    {
      question: 'Can I build it?',
      answer: summary.undecided > 0 ? 'open' : fails > 0 ? 'no' : 'yes',
      detail:
        fails > 0
          ? `${fails} rule(s) fail and need a fix.`
          : summary.undecided > 0
            ? `${summary.undecided} rule(s) can't be decided yet.`
            : 'No failing rules.',
    },
    {
      question: 'Can I get it approved?',
      answer: readiness.overall === 100 ? 'yes' : 'open',
      detail: `Readiness ${readiness.overall}%.`,
    },
    {
      question: 'Can I source it?',
      answer: selected.length === 0 ? 'open' : selected.every((entry) => entry.recommended) ? 'yes' : 'no',
      detail: selected.length
        ? `${selected.filter((entry) => entry.recommended).length}/${selected.length} selected materials recommended.`
        : 'No materials selected yet.',
    },
    {
      question: 'Can I document it?',
      answer: readiness.proofIn.pct === 100 ? 'yes' : 'open',
      detail: `${readiness.proofIn.done}/${readiness.proofIn.total} required documents in.`,
    },
    { question: 'What will it cost?', answer: 'future', detail: 'Cost estimation is on the roadmap.' },
    {
      question: 'Can I get funding?',
      answer: programs.some((program) => program.status === 'ELIGIBLE')
        ? 'yes'
        : programs.length
          ? 'open'
          : 'future',
      detail: programs.length
        ? programs.map((program) => `${program.name}: ${FUNDING_STATUS_LABELS[program.status]}`).join('; ')
        : 'No programs modelled for this jurisdiction.',
    },
  ];

  return (
    <Card>
      <CardHeader
        title="The contractor’s questions"
        description="Answered from this project’s compliance record."
      />
      <CardBody>
        <ul className="space-y-3">
          {rows.map((row) => {
            const { Icon, className } = ANSWER_ICON[row.answer];
            return (
              <li key={row.question} className="flex items-start gap-3 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-label={row.answer} />
                <span>
                  <span className="font-medium">{row.question}</span>
                  <span className="block text-muted">{row.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

export default function FundingPage() {
  const id = useProjectId();
  const funding = useFunding(id);

  if (funding.isPending) return <PageSkeleton />;
  if (funding.isError) return <ErrorState error={funding.error} onRetry={() => funding.refetch()} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6">
        {funding.data.programs.length === 0 ? (
          <EmptyState icon={Banknote} title="No funding programs modelled" description={funding.data.note} />
        ) : (
          funding.data.programs.map((program) => (
            <Card key={program.programId}>
              <CardHeader
                title={program.name}
                description={program.administrator}
                action={
                  <Badge tone={STATUS_TONE[program.status]}>{FUNDING_STATUS_LABELS[program.status]}</Badge>
                }
              />
              <CardBody className="space-y-5">
                <p className="text-sm text-muted">{program.description}</p>
                {program.criteria.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Eligibility criteria</h3>
                    <CriteriaList criteria={program.criteria} />
                  </div>
                )}
                {program.informationRequirements.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Information requirements</h3>
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {program.informationRequirements.map((entry) => (
                        <li
                          key={entry.requirement.key}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <span>{entry.requirement.title}</span>
                          <EvidenceStatusBadge status={entry.status} />
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/projects/${id}/evidence#${program.ruleId}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-pine-700 hover:underline"
                    >
                      Provide documents <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                )}
                {program.complianceLinks.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Compliance feeding the application</h3>
                    <ul className="space-y-1.5 text-sm">
                      {program.complianceLinks.map((link) => (
                        <li key={link.label}>
                          <span className="font-medium">{link.label}</span>
                          <span className="block text-muted">{link.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {program.nextAction && (
                  <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
                    {program.nextAction}
                  </p>
                )}
              </CardBody>
            </Card>
          ))
        )}
        <p className="text-xs text-muted">{funding.data.note}</p>
      </div>
      <aside className="min-w-0">
        <ContractorQuestions />
      </aside>
    </div>
  );
}
