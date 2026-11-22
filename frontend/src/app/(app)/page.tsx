'use client';

import { JURISDICTION_LABELS, type ProjectSummary } from '@greenforce/shared';
import { ArrowRight, Building2, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Ring } from '@/components/ui/progress';
import { formatDate } from '@/lib/format';
import { useProjects } from '@/lib/queries';

const WORKFLOW = [
  'Project address',
  'Property intelligence',
  'Applicable requirements',
  'Required evidence',
  'Materials & suppliers',
  'Compliance status',
  'Project passport',
];

function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href={`/projects/${project.id}`} className="group block focus-visible:outline-none">
      <Card className="h-full p-5 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-pine-500">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{JURISDICTION_LABELS[project.jurisdiction]}</Badge>
              <span className="font-mono text-xs text-muted">{project.greenforceId}</span>
            </div>
            <h3 className="font-semibold leading-snug group-hover:text-pine-800">{project.name}</h3>
            <p className="mt-1 flex items-start gap-1 text-sm text-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {project.address}
            </p>
          </div>
          <Ring value={project.readiness.overall} label="Readiness" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
          {project.openIssues > 0 ? (
            <span className="font-medium text-amber-800">{project.openIssues} open actions</span>
          ) : (
            <span className="font-medium text-pine-700">No open actions</span>
          )}
          <span className="flex items-center gap-1 text-muted">
            Updated {formatDate(project.updatedAt)}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const projects = useProjects();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Every project starts from an address. GreenForce determines which rules apply, what proof you need
            and what to fix — then records it in a compliance passport.
          </p>
        </div>
        <ButtonLink href="/projects/new" icon={<Plus className="size-4" aria-hidden />}>
          New project
        </ButtonLink>
      </div>

      <ol aria-label="GreenForce workflow" className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {WORKFLOW.map((step, index) => (
          <li key={step} className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-surface px-3 py-1.5 font-medium ring-1 ring-line">
              <span className="mr-1.5 text-pine-600">{index + 1}</span>
              {step}
            </span>
            {index < WORKFLOW.length - 1 && <ArrowRight className="size-3.5 text-stone-400" aria-hidden />}
          </li>
        ))}
      </ol>

      {projects.isPending && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-44" />
          ))}
        </div>
      )}
      {projects.isError && <ErrorState error={projects.error} onRetry={() => projects.refetch()} />}
      {projects.isSuccess && projects.data.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No projects yet"
          description="Search an address in Denmark or Germany to create your first project and its GreenForce ID."
          action={<ButtonLink href="/projects/new">Start a project</ButtonLink>}
        />
      )}
      {projects.isSuccess && projects.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
