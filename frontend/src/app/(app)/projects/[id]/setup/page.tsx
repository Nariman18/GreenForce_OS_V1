'use client';

import {
  DkMeasurementsSchema,
  DkSetupSchema,
  EDITION_BASIS_LABELS,
  DeMeasurementsSchema,
  DeSetupSchema,
  type ProjectMeasurements,
  type ProjectSetup,
} from '@greenforce/shared';
import { ArrowRight } from 'lucide-react';
import { DeclarationForm } from '@/components/declaration-form';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useCompliance, useProject, useSaveMeasurements, useSaveSetup } from '@/lib/queries';
import { useProjectId } from '../project-context';
import { DK_MEASUREMENT_FIELDS, DK_SETUP_FIELDS, DE_MEASUREMENT_FIELDS, DE_SETUP_FIELDS } from './fields';

export default function SetupPage() {
  const id = useProjectId();
  const project = useProject(id);
  const compliance = useCompliance(id);
  const saveSetup = useSaveSetup(id);
  const saveMeasurements = useSaveMeasurements(id);
  if (!project.data) return null;

  const { jurisdiction, setup, measurements } = project.data;
  const isDk = jurisdiction === 'DK';
  const result = compliance.data;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader
            title="Project setup"
            description={`Declare the characteristics that decide which rules apply and which edition is in force (${EDITION_BASIS_LABELS[jurisdiction].toLowerCase()}). Leave unknown items as “Not declared”.`}
          />
          <CardBody>
            <DeclarationForm<ProjectSetup>
              schema={isDk ? DkSetupSchema : DeSetupSchema}
              fields={isDk ? DK_SETUP_FIELDS : DE_SETUP_FIELDS}
              defaultValues={setup}
              submitLabel="Save setup"
              successMessage="Saved — requirements re-evaluated."
              onSubmit={(values) => saveSetup.mutateAsync({ ...values, jurisdiction } as ProjectSetup)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Design measurements"
            description="Values from your LCA, energy and design calculations. GreenForce compares them with the limits of the rules that apply."
          />
          <CardBody>
            <DeclarationForm<ProjectMeasurements>
              schema={isDk ? DkMeasurementsSchema : DeMeasurementsSchema}
              fields={isDk ? DK_MEASUREMENT_FIELDS : DE_MEASUREMENT_FIELDS}
              defaultValues={measurements}
              submitLabel="Save measurements"
              successMessage="Saved — computed checks updated."
              onSubmit={(values) =>
                saveMeasurements.mutateAsync({ ...values, jurisdiction } as ProjectMeasurements)
              }
            />
          </CardBody>
        </Card>
      </div>

      <aside className="min-w-0 space-y-4">
        <Card>
          <CardHeader title="Effect on requirements" />
          <CardBody className="space-y-3 text-sm">
            {result ? (
              <>
                <p>
                  <span className="font-medium">Edition:</span>{' '}
                  {result.edition ? (
                    result.edition.name
                  ) : (
                    <span className="text-amber-800">{result.editionNote}</span>
                  )}
                </p>
                <p>
                  {result.summary.applies} rules apply · {result.summary.setAside} set aside ·{' '}
                  {result.summary.undecided} can’t be decided yet
                </p>
                <ButtonLink
                  href={`/projects/${id}/requirements`}
                  variant="secondary"
                  size="sm"
                  icon={<ArrowRight className="size-4" aria-hidden />}
                >
                  Review requirements
                </ButtonLink>
              </>
            ) : (
              <p className="text-muted">Evaluating…</p>
            )}
          </CardBody>
        </Card>
        <p className="px-1 text-xs text-muted">
          GreenForce isn’t listing building regulations — it determines, for this project, which rules apply
          and why.
        </p>
      </aside>
    </div>
  );
}
