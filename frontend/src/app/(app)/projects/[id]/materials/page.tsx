'use client';

import {
  MATERIAL_CATEGORY_LABELS,
  type MaterialRecommendation,
  SUPPLIER_RESULT_LABELS,
  type SupplierResult,
} from '@greenforce/shared';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, PackageSearch, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, EmptyState, ErrorState, PageSkeleton } from '@/components/ui/feedback';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { useProjectMaterials, useToggleMaterial } from '@/lib/queries';
import { useProjectId } from '../project-context';

const SUPPLIER_TONE: Record<SupplierResult, BadgeTone> = {
  QUALIFIED: 'success',
  CONDITIONAL: 'warning',
  NOT_QUALIFIED: 'danger',
};

const FIT_ICON = { PASS: CheckCircle2, FAIL: XCircle, INFO: Info } as const;

function MaterialCard({ entry, projectId }: { entry: MaterialRecommendation; projectId: string }) {
  const toggle = useToggleMaterial(projectId);
  const { material, fits } = entry;
  const { supplier } = material;

  return (
    <Card className={cn('flex flex-col p-5', entry.selected && 'ring-2 ring-pine-500')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge tone="outline">{MATERIAL_CATEGORY_LABELS[material.category]}</Badge>
            {entry.recommended ? (
              <Badge tone="brand">Recommended</Badge>
            ) : (
              <Badge tone="neutral">Review</Badge>
            )}
            {entry.selected && <Badge tone="success">Selected</Badge>}
          </div>
          <h3 className="font-semibold">{material.name}</h3>
          <p className="text-sm text-muted">
            {material.manufacturer} · {material.description}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">GWP (A1–A3)</dt>
          <dd className="font-medium tabular-nums">
            {material.gwp === null ? 'Not declared' : `${formatNumber(material.gwp, 2)} ${material.gwpUnit}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">EPD</dt>
          <dd className="font-medium">
            {material.epd ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs">{material.epd.number}</span>
                <Badge tone={material.epd.valid ? 'success' : 'danger'}>
                  {material.epd.valid
                    ? `valid to ${formatDate(material.epd.validTo)}`
                    : `expired ${formatDate(material.epd.validTo)}`}
                </Badge>
              </span>
            ) : (
              <span className="text-muted">None</span>
            )}
          </dd>
        </div>
        {material.attributes.euroclass && (
          <div className="col-span-2 flex flex-wrap gap-1.5">
            {material.attributes.euroclass && (
              <Badge tone="info">Euroclass {material.attributes.euroclass}</Badge>
            )}
          </div>
        )}
      </dl>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          Against this project’s rules
        </p>
        <ul className="space-y-1.5">
          {fits.map((fit) => {
            const Icon = FIT_ICON[fit.result];
            return (
              <li key={fit.ruleId} className="flex items-start gap-2 text-sm">
                <Icon
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    fit.result === 'PASS' && 'text-emerald-600',
                    fit.result === 'FAIL' && 'text-rose-600',
                    fit.result === 'INFO' && 'text-sky-600',
                  )}
                  aria-label={fit.result.toLowerCase()}
                />
                <span>
                  <span className="font-medium">{fit.title}</span>{' '}
                  <span className="font-mono text-xs text-muted">{fit.code}</span>
                  <span className="block text-muted">{fit.detail}</span>
                </span>
              </li>
            );
          })}
          {fits.length === 0 && (
            <li className="text-sm text-muted">No longer related to an applicable rule.</li>
          )}
        </ul>
      </div>

      <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{supplier.name}</p>
          <Badge tone={SUPPLIER_TONE[supplier.result]}>{SUPPLIER_RESULT_LABELS[supplier.result]}</Badge>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={supplier.ratingScore} label={`${supplier.name} rating`} className="flex-1" />
          <span className="text-xs tabular-nums text-muted">{supplier.ratingScore}/100</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Documentation valid to {formatDate(supplier.documentationValidTo)} ·{' '}
          {supplier.counted ? (
            <span className="font-medium text-pine-700">counted</span>
          ) : (
            <span className="font-medium text-rose-700">not counted (expired)</span>
          )}
        </p>
      </div>

      {entry.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {entry.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-1.5 text-xs text-amber-900">
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <Button
          variant={entry.selected ? 'secondary' : 'primary'}
          size="sm"
          className="w-full"
          loading={toggle.isPending}
          onClick={() => toggle.mutate({ materialId: material.id, select: !entry.selected })}
        >
          {entry.selected ? 'Remove from project' : 'Select for project'}
        </Button>
        {toggle.isError && (
          <Alert tone="danger" className="mt-2">
            {toggle.error.message}
          </Alert>
        )}
      </div>
    </Card>
  );
}

export default function MaterialsPage() {
  const id = useProjectId();
  const materials = useProjectMaterials(id);
  const [recommendedOnly, setRecommendedOnly] = useState(false);

  if (materials.isPending) return <PageSkeleton />;
  if (materials.isError) return <ErrorState error={materials.error} onRetry={() => materials.refetch()} />;

  const entries = materials.data.recommendations.filter(
    (entry) => !recommendedOnly || entry.recommended || entry.selected,
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-pine-800">
              Compliance <ArrowRight className="size-3.5" aria-hidden /> Materials{' '}
              <ArrowRight className="size-3.5" aria-hidden /> Suppliers{' '}
              <ArrowRight className="size-3.5" aria-hidden /> Procurement
            </p>
            <p className="mt-1 text-sm text-muted">
              Materials related to the rules that apply to this project, scored on GWP, EPD validity, listings
              and supplier qualification. {materials.data.selectedCount} selected. Sample catalog data.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={recommendedOnly}
              onChange={(event) => setRecommendedOnly(event.target.checked)}
              className="size-4 accent-pine-700"
            />
            Recommended only
          </label>
        </div>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No material requirements yet"
          description="Materials appear when an applicable rule constrains products — e.g. LCA/EPDs, fire classes or project documentation targets."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {entries.map((entry) => (
            <MaterialCard key={entry.material.id} entry={entry} projectId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
