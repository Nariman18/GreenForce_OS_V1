'use client';

import type { PassportContent } from '@greenforce/shared';
import { FileJson, History, Printer, ShieldCheck, Stamp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Alert, ErrorState, PageSkeleton, Skeleton } from '@/components/ui/feedback';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { formatDateTime, shortHash } from '@/lib/format';
import { useHistory, useIssueSnapshot, usePassport, useSnapshot, useSnapshots } from '@/lib/queries';
import { useProjectId } from '../project-context';
import { PassportDocument } from './passport-document';

function downloadJson(fileName: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function IssuePanel({ changed, hasVersions }: { changed: boolean; hasVersions: boolean }) {
  const id = useProjectId();
  const issue = useIssueSnapshot(id);
  const [note, setNote] = useState('');
  return (
    <Card>
      <CardHeader
        title="Issue a passport version"
        description="Freezes the current record. Each version links to the previous fingerprint."
      />
      <CardBody className="space-y-3">
        {!hasVersions ? (
          <Alert tone="info">No version issued yet — issue one to freeze today’s record.</Alert>
        ) : changed ? (
          <Alert tone="warning">The live record has changed since the latest issued version.</Alert>
        ) : (
          <Alert tone="success">The latest issued version matches the live record.</Alert>
        )}
        <Input
          aria-label="Version note"
          placeholder="Note, e.g. “Submitted to plan check”"
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          className="w-full"
          icon={<Stamp className="size-4" aria-hidden />}
          loading={issue.isPending}
          disabled={!changed}
          onClick={() => issue.mutate(note.trim(), { onSuccess: () => setNote('') })}
        >
          Issue version
        </Button>
        {issue.isError && <Alert tone="danger">{issue.error.message}</Alert>}
      </CardBody>
    </Card>
  );
}

export default function PassportPage() {
  const id = useProjectId();
  const live = usePassport(id);
  const snapshots = useSnapshots(id);
  const history = useHistory(id);
  const [version, setVersion] = useState<number | null>(null);
  const frozen = useSnapshot(id, version);

  if (live.isPending) return <PageSkeleton />;
  if (live.isError) return <ErrorState error={live.error} onRetry={() => live.refetch()} />;

  const viewing: { content: PassportContent; fingerprint: string; label: string; issuedAt: string } | null =
    version === null
      ? {
          content: live.data.content,
          fingerprint: live.data.fingerprint,
          label: 'Live record (not yet issued)',
          issuedAt: live.data.generatedAt,
        }
      : frozen.data
        ? {
            content: frozen.data.content,
            fingerprint: frozen.data.fingerprint,
            label: `Issued version ${frozen.data.version}${frozen.data.note ? ` — ${frozen.data.note}` : ''}`,
            issuedAt: frozen.data.issuedAt,
          }
        : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)]">
      <div className="min-w-0 space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={version === null ? 'warning' : 'brand'}
              icon={<ShieldCheck className="size-3.5" aria-hidden />}
            >
              {version === null ? 'Live record' : `Version ${version}`}
            </Badge>
            {version !== null && (
              <button
                type="button"
                className="text-sm font-medium text-pine-700 hover:underline"
                onClick={() => setVersion(null)}
              >
                Back to live record
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="size-4" aria-hidden />}
              onClick={() => window.print()}
            >
              Print statement
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileJson className="size-4" aria-hidden />}
              disabled={!viewing}
              onClick={() =>
                viewing &&
                downloadJson(
                  `${viewing.content.greenforceId}-passport${version ? `-v${version}` : '-live'}.json`,
                  {
                    fingerprint: viewing.fingerprint,
                    content: viewing.content,
                  },
                )
              }
            >
              Download JSON
            </Button>
          </div>
        </div>
        {viewing ? (
          <PassportDocument {...viewing} />
        ) : frozen.isError ? (
          <ErrorState error={frozen.error} />
        ) : (
          <Skeleton className="h-[40rem]" />
        )}
      </div>

      <aside className="no-print min-w-0 space-y-6">
        <IssuePanel
          changed={live.data.changedSinceLatestSnapshot}
          hasVersions={live.data.latestSnapshot !== null}
        />

        <Card>
          <CardHeader title="Issued versions" />
          <CardBody>
            {snapshots.isPending && <Skeleton className="h-24" />}
            {snapshots.data?.length === 0 && <p className="text-sm text-muted">No versions issued yet.</p>}
            <ol className="space-y-2">
              {snapshots.data?.map((snapshot) => (
                <li key={snapshot.id}>
                  <button
                    type="button"
                    onClick={() => setVersion(snapshot.version)}
                    aria-pressed={version === snapshot.version}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50',
                      version === snapshot.version ? 'border-pine-500 bg-pine-50/50' : 'border-line',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">Version {snapshot.version}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {snapshot.readinessOverall}% ready
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatDateTime(snapshot.issuedAt)} · {snapshot.issuedBy}
                    </span>
                    {snapshot.note && <span className="mt-0.5 block text-xs">“{snapshot.note}”</span>}
                    <span className="mt-1 block font-mono text-[11px] text-muted">
                      {shortHash(snapshot.fingerprint)}
                      {snapshot.previousFingerprint
                        ? ` ← ${shortHash(snapshot.previousFingerprint)}`
                        : ' (first)'}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Project history"
            action={<History className="size-4 text-muted" aria-hidden />}
          />
          <CardBody>
            {history.isPending && <Skeleton className="h-32" />}
            {history.isError && <ErrorState error={history.error} />}
            <ol className="relative space-y-3 border-l border-line pl-4">
              {history.data?.map((event) => (
                <li key={event.id} className="text-sm">
                  <span
                    className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-pine-500"
                    aria-hidden
                  />
                  <p>{event.summary}</p>
                  <p className="text-xs text-muted">
                    {event.actor} · {formatDateTime(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
