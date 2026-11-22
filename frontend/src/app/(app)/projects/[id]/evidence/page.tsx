'use client';

import { FileStack } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/feedback';
import { ProgressBar } from '@/components/ui/progress';
import { VerdictBadge } from '@/components/verdict-badge';
import { useCompliance, useProjectMaterials } from '@/lib/queries';
import { useProjectId } from '../project-context';
import { RequirementRow } from './requirement-row';

export default function EvidencePage() {
  const id = useProjectId();
  const compliance = useCompliance(id);
  const materials = useProjectMaterials(id);

  if (compliance.isPending) return <PageSkeleton />;
  if (compliance.isError) return <ErrorState error={compliance.error} onRetry={() => compliance.refetch()} />;

  const result = compliance.data;
  const rules = result.rules.filter((rule) => rule.applicability === 'APPLIES' && rule.evidence.length > 0);
  const selected =
    materials.data?.recommendations.filter((entry) => entry.selected).map((entry) => entry.material) ?? [];
  const { proofIn } = result.readiness;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Requirement → Evidence → Status</h2>
            <p className="mt-0.5 text-sm text-muted">
              Every document is fingerprinted with SHA-256 on upload, so the passport can prove what was
              submitted.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">Proof in</span>
              <span className="tabular-nums text-muted">
                {proofIn.done}/{proofIn.total} · {proofIn.pct}%
              </span>
            </div>
            <ProgressBar value={proofIn.pct} label="Proof in" />
          </div>
        </div>
      </Card>

      {rules.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No evidence required yet"
          description="Evidence requirements appear once rules apply. Complete the project setup to decide which rules apply."
          action={<ButtonLink href={`/projects/${id}/setup`}>Go to setup</ButtonLink>}
        />
      ) : (
        rules.map((rule) => (
          <Card key={rule.ruleId} id={rule.ruleId} className="scroll-mt-24">
            <CardHeader
              title={rule.title}
              description={
                <>
                  <span className="font-mono">{rule.code}</span> ·{' '}
                  {rule.evidence.filter((e) => e.status !== 'MISSING').length}/{rule.evidence.length} provided
                </>
              }
              action={<VerdictBadge verdict={rule.verdict} />}
            />
            <CardBody className="divide-y divide-line">
              {rule.evidence.map((entry) => (
                <RequirementRow
                  key={entry.requirement.key}
                  projectId={id}
                  ruleId={rule.ruleId}
                  entry={entry}
                  selectedMaterials={selected}
                />
              ))}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
