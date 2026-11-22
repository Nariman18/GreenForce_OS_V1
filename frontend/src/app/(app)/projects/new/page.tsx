'use client';

import {
  JURISDICTION_LABELS,
  JURISDICTIONS,
  type Jurisdiction,
  ProjectNameSchema,
  type PropertyCandidate,
} from '@greenforce/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Fingerprint, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { OverlayList, PropertyFacts, SourceNote } from '@/components/property-facts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, EmptyState, ErrorState, Skeleton, Spinner } from '@/components/ui/feedback';
import { Field, Input } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { useCreateProject, usePropertyPreview, usePropertySearch } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useUiStore } from '@/store/ui-store';

const EXAMPLES: Record<Jurisdiction, string[]> = {
  DK: ['Tingbjerg', 'Sandkaj', 'Skovvangen', 'Lyngvej'],
  DE: ['Karl-Marx-Allee', 'Invalidenstraße', 'Hafenstraße', 'Leopoldstraße'],
};

const NameFormSchema = z.object({ name: ProjectNameSchema });

function CreateProjectForm({
  jurisdiction,
  candidate,
}: {
  jurisdiction: Jurisdiction;
  candidate: PropertyCandidate;
}) {
  const router = useRouter();
  const create = useCreateProject();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof NameFormSchema>>({
    resolver: zodResolver(NameFormSchema),
    defaultValues: { name: `${candidate.address.split(',')[0]} project` },
  });

  const onSubmit = handleSubmit(({ name }) =>
    create.mutate(
      { jurisdiction, sourceRef: candidate.sourceRef, name },
      { onSuccess: (project) => router.push(`/projects/${project.id}/setup`) },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {create.isError && <Alert tone="danger">{create.error.message}</Alert>}
      <Field
        label="Project name"
        hint="Shown on the dashboard and the compliance passport."
        error={errors.name?.message}
      >
        {(props) => <Input {...props} {...register('name')} />}
      </Field>
      <Button type="submit" className="w-full" loading={create.isPending}>
        Create project & continue to setup
      </Button>
    </form>
  );
}

export default function NewProjectPage() {
  const jurisdiction = useUiStore((state) => state.searchJurisdiction);
  const setJurisdiction = useUiStore((state) => state.setSearchJurisdiction);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PropertyCandidate | null>(null);
  const debounced = useDebouncedValue(query.trim());
  const search = usePropertySearch(jurisdiction, debounced);
  const preview = usePropertyPreview(jurisdiction, selected?.sourceRef ?? null);

  const switchJurisdiction = (next: Jurisdiction) => {
    setJurisdiction(next);
    setSelected(null);
    setQuery('');
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New project</h1>
        <p className="mt-1 text-sm text-muted">
          Step 1 — find the property. GreenForce resolves it against jurisdiction sources and issues a
          GreenForce ID.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader
            title="Address search"
            description="Choose the jurisdiction, then type an address or parcel."
          />
          <CardBody className="space-y-4">
            <div
              role="radiogroup"
              aria-label="Jurisdiction"
              className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1"
            >
              {JURISDICTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={jurisdiction === option}
                  onClick={() => switchJurisdiction(option)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    jurisdiction === option ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {JURISDICTION_LABELS[option]}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <Input
                type="search"
                aria-label="Search address"
                placeholder={jurisdiction === 'DK' ? 'e.g. Tingbjerg Allé 12' : 'e.g. Karl-Marx-Allee 12'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                autoFocus
              />
              {search.isFetching && <Spinner className="absolute right-3 top-2.5 size-4 text-muted" />}
            </div>

            <p className="text-xs text-muted">
              Try:{' '}
              {EXAMPLES[jurisdiction].map((example, index) => (
                <span key={example}>
                  <button
                    type="button"
                    className="font-medium text-pine-700 hover:underline"
                    onClick={() => setQuery(example)}
                  >
                    {example}
                  </button>
                  {index < EXAMPLES[jurisdiction].length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>

            {search.isError && <ErrorState error={search.error} />}
            {debounced.length >= 2 && search.isSuccess && search.data.length === 0 && (
              <p className="rounded-lg bg-stone-50 px-3 py-4 text-center text-sm text-muted">
                No property matches “{debounced}” in {JURISDICTION_LABELS[jurisdiction]}.
              </p>
            )}
            {search.data && search.data.length > 0 && debounced.length >= 2 && (
              <ul
                className="divide-y divide-line overflow-hidden rounded-lg border border-line"
                aria-label="Search results"
              >
                {search.data.map((candidate) => (
                  <li key={candidate.sourceRef}>
                    <button
                      type="button"
                      onClick={() => setSelected(candidate)}
                      aria-pressed={selected?.sourceRef === candidate.sourceRef}
                      className={cn(
                        'flex w-full items-start gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-pine-50/60',
                        selected?.sourceRef === candidate.sourceRef && 'bg-pine-50',
                      )}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium">{candidate.address}</span>
                        <span className="block text-xs text-muted">
                          Parcel {candidate.parcelId} · {candidate.summary}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="min-w-0">
          {!selected && (
            <EmptyState
              icon={Fingerprint}
              title="Property intelligence appears here"
              description="Select a search result to see the building record, authority and geographic overlays before creating the project."
            />
          )}
          {selected && preview.isPending && <Skeleton className="h-96" />}
          {selected && preview.isError && (
            <ErrorState error={preview.error} onRetry={() => preview.refetch()} />
          )}
          {selected && preview.data && (
            <Card>
              <CardHeader
                title={preview.data.address}
                description={`Step 2 — property intelligence · ${JURISDICTION_LABELS[preview.data.jurisdiction]}`}
                action={
                  <Badge tone="brand" icon={<Fingerprint className="size-3.5" aria-hidden />}>
                    <span className="font-mono">{preview.data.greenforceId}</span>
                  </Badge>
                }
              />
              <CardBody className="space-y-6">
                <PropertyFacts property={preview.data} />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Authority & geographic overlays</h3>
                  <OverlayList overlays={preview.data.overlays} />
                </div>
                <SourceNote source={preview.data.source} />
                <div className="border-t border-line pt-5">
                  <CreateProjectForm
                    key={selected.sourceRef}
                    jurisdiction={jurisdiction}
                    candidate={selected}
                  />
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
