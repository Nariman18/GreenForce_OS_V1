'use client';

import {
  apiPaths,
  EVIDENCE_KIND_LABELS,
  EVIDENCE_UPLOAD,
  type EvidenceItem,
  type Material,
  type RequirementEvidence,
} from '@greenforce/shared';
import { BadgeCheck, Download, Link2, Package, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/field';
import { EvidenceStatusBadge } from '@/components/verdict-badge';
import { apiUrl } from '@/lib/api-client';
import { formatBytes, formatDateTime, shortHash } from '@/lib/format';
import {
  useLinkMaterialEvidence,
  useRemoveEvidence,
  useUploadEvidence,
  useVerifyEvidence,
} from '@/lib/queries';

/** Mirrors the API's checks so users get immediate feedback; the API remains the authority. */
export function validateEvidenceFile(file: File): string | null {
  if (file.size > EVIDENCE_UPLOAD.maxBytes)
    return `File is larger than ${formatBytes(EVIDENCE_UPLOAD.maxBytes)}.`;
  if (!(EVIDENCE_UPLOAD.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return 'Upload a PDF, PNG, JPEG, CSV, XLSX or DOCX file.';
  }
  return null;
}

function EvidenceItemRow({ projectId, item }: { projectId: string; item: EvidenceItem }) {
  const verify = useVerifyEvidence(projectId);
  const remove = useRemoveEvidence(projectId);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-stone-50 px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {item.source === 'catalog' ? <Package className="size-4 text-pine-600" aria-hidden /> : null}
          <span className="break-all">{item.fileName}</span>
          {item.verified && (
            <Badge tone="success" icon={<BadgeCheck className="size-3.5" aria-hidden />}>
              Verified
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {formatBytes(item.sizeBytes)} · {item.uploadedBy} · {formatDateTime(item.createdAt)} ·{' '}
          <span className="font-mono" title={item.sha256}>
            sha256 {shortHash(item.sha256)}
          </span>
        </p>
        {item.note && <p className="mt-0.5 text-xs text-muted">“{item.note}”</p>}
      </div>
      <div className="flex items-center gap-1">
        <a
          href={apiUrl(apiPaths.evidenceFile(projectId, item.id))}
          className="rounded-lg p-2 text-muted hover:bg-stone-200 hover:text-ink"
          aria-label={`Download ${item.fileName}`}
        >
          <Download className="size-4" />
        </a>
        <Button
          size="sm"
          variant="ghost"
          loading={verify.isPending}
          onClick={() => verify.mutate({ evidenceId: item.id, verified: !item.verified })}
        >
          {item.verified ? 'Unverify' : 'Mark verified'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={remove.isPending}
          onClick={() => remove.mutate(item.id)}
          aria-label={`Remove ${item.fileName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function RequirementRow({
  projectId,
  ruleId,
  entry,
  selectedMaterials,
}: {
  projectId: string;
  ruleId: string;
  entry: RequirementEvidence;
  selectedMaterials: Material[];
}) {
  const { requirement } = entry;
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState('');
  const upload = useUploadEvidence(projectId);
  const link = useLinkMaterialEvidence(projectId);

  const linkable = selectedMaterials.filter(
    (material) =>
      requirement.materialCategories?.includes(material.category) &&
      !entry.items.some((item) => item.materialId === material.id),
  );

  const chooseFile = (chosen: File | null) => {
    setFile(chosen);
    setFileError(chosen ? validateEvidenceFile(chosen) : null);
  };

  const submit = () => {
    if (!file || fileError) return;
    upload.mutate(
      { ruleId, requirementKey: requirement.key, file, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setFile(null);
          setNote('');
          if (fileInput.current) fileInput.current.value = '';
        },
      },
    );
  };

  return (
    <div className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {requirement.title}
            <Badge tone="outline">{EVIDENCE_KIND_LABELS[requirement.kind]}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted">{requirement.description}</p>
        </div>
        <EvidenceStatusBadge status={entry.status} />
      </div>

      {entry.items.length > 0 && (
        <ul className="space-y-2">
          {entry.items.map((item) => (
            <EvidenceItemRow key={item.id} projectId={projectId} item={item} />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={inputId} className="sr-only">
          File for {requirement.title}
        </label>
        <input
          id={inputId}
          ref={fileInput}
          type="file"
          accept={EVIDENCE_UPLOAD.acceptAttribute}
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          className="block w-full min-w-0 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-pine-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-pine-800 hover:file:bg-pine-100 sm:max-w-64"
        />
        <Input
          aria-label={`Note for ${requirement.title}`}
          placeholder="Note (optional)"
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          className="h-9 sm:flex-1"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={!file || Boolean(fileError)}
          loading={upload.isPending}
          icon={<Upload className="size-4" aria-hidden />}
        >
          Upload
        </Button>
      </div>
      {fileError && <Alert tone="danger">{fileError}</Alert>}
      {upload.isError && <Alert tone="danger">{upload.error.message}</Alert>}

      {linkable.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-pine-200 bg-pine-50/40 p-3 sm:flex-row sm:items-center">
          <span className="text-sm text-pine-900">Use a selected material:</span>
          <Select
            aria-label={`Selected material for ${requirement.title}`}
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
            className="h-9 sm:flex-1"
          >
            <option value="">Choose material…</option>
            {linkable.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} — {material.epd ? `EPD ${material.epd.number}` : 'product data'}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!materialId}
            loading={link.isPending}
            icon={<Link2 className="size-4" aria-hidden />}
            onClick={() =>
              link.mutate(
                { ruleId, requirementKey: requirement.key, materialId },
                { onSuccess: () => setMaterialId('') },
              )
            }
          >
            Link
          </Button>
        </div>
      )}
      {link.isError && <Alert tone="danger">{link.error.message}</Alert>}
    </div>
  );
}
