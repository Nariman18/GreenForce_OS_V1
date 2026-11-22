'use client';

import { VERDICT_LABELS, VERDICTS } from '@greenforce/shared';
import { FixList } from '@/components/fix-list';
import { OverlayList, PropertyFacts, SourceNote } from '@/components/property-facts';
import { ReadinessPanel } from '@/components/readiness-panel';
import { Alert, ErrorState, Skeleton } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { VerdictBadge } from '@/components/verdict-badge';
import { useCompliance, useProject } from '@/lib/queries';
import { useProjectId } from './project-context';

export default function ProjectOverviewPage() {
  const id = useProjectId();
  const project = useProject(id);
  const compliance = useCompliance(id);
  if (!project.data) return null;
  const result = compliance.data;
  const setupEmpty = Object.keys(project.data.setup).length <= 1;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6">
        {setupEmpty && (
          <Alert tone="info" className="flex flex-wrap items-center justify-between gap-3">
            <span>Declare the project characteristics so GreenForce can decide which rules apply.</span>
            <ButtonLink href={`/projects/${id}/setup`} size="sm">
              Go to setup
            </ButtonLink>
          </Alert>
        )}
        <Card>
          <CardHeader title="What do I need to fix?" description="Open actions, most urgent first." />
          <CardBody>
            {compliance.isPending && <Skeleton className="h-40" />}
            {compliance.isError && (
              <ErrorState error={compliance.error} onRetry={() => compliance.refetch()} />
            )}
            {result && <FixList projectId={id} items={result.fixList} limit={6} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Property intelligence" description="The project-specific property record." />
          <CardBody className="space-y-6">
            <PropertyFacts property={project.data.property} />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Geographic overlays</h3>
              <OverlayList overlays={project.data.property.overlays} />
            </div>
            <SourceNote source={project.data.property.source} />
          </CardBody>
        </Card>
      </div>

      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader
            title="Compliance readiness"
            description="Rules decided · proof in · computed checks passing"
          />
          <CardBody>
            {result ? <ReadinessPanel readiness={result.readiness} /> : <Skeleton className="h-28" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Rules at a glance" />
          <CardBody>
            {result ? (
              <div className="space-y-4">
                <dl className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Checked', result.summary.checked],
                    ['Apply', result.summary.applies],
                    ['Set aside', result.summary.setAside],
                    ["Can't decide", result.summary.undecided],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-stone-50 px-2 py-3">
                      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
                      <dt className="text-xs text-muted">{label}</dt>
                    </div>
                  ))}
                </dl>
                <ul className="space-y-2">
                  {VERDICTS.filter((verdict) => result.summary.verdictCounts[verdict] > 0).map((verdict) => (
                    <li key={verdict} className="flex items-center justify-between text-sm">
                      <VerdictBadge verdict={verdict} />
                      <span className="tabular-nums text-muted">
                        {result.summary.verdictCounts[verdict]}{' '}
                        <span className="sr-only">{VERDICT_LABELS[verdict]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">{result.disclaimer}</p>
              </div>
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
