import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type {
  EvidenceItem,
  EvidenceRequirement,
  LinkMaterialEvidenceRequest,
  UploadEvidenceFields,
  User,
} from '@greenforce/shared';
import type { Evidence } from '../../generated/prisma/client.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { AuditService } from '../audit/audit.service.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { ProjectsRepository, toEvidenceItem } from '../projects/projects.repository.js';
import { canonicalJson } from '../passport/fingerprint.js';
import { contentMatchesType, isAllowedMimeType } from './content-sniffing.js';
import { FileStorageService } from './file-storage.service.js';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface EvidenceDownload {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

/** Keeps a readable, header-safe file name. */
const sanitiseFileName = (name: string) =>
  name
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .slice(0, 120) || 'evidence';

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    private readonly compliance: ComplianceService,
    private readonly repository: ProjectsRepository,
    private readonly storage: FileStorageService,
    private readonly audit: AuditService,
  ) {}

  /** Finds a requirement on a rule that currently applies; evidence for anything else is rejected. */
  private async requirementFor(projectId: string, user: User, ruleId: string, requirementKey: string) {
    const evaluation = await this.compliance.evaluateOwned(projectId, user.id);
    const rule = evaluation.result.rules.find((entry) => entry.ruleId === ruleId);
    if (!rule || rule.applicability !== 'APPLIES') {
      throw new BadRequestException(`Rule ${ruleId} does not currently apply to this project`);
    }
    const entry = rule.evidence.find((candidate) => candidate.requirement.key === requirementKey);
    if (!entry) throw new BadRequestException(`Rule ${ruleId} has no requirement "${requirementKey}"`);
    return { evaluation, rule, requirement: entry.requirement };
  }

  async upload(
    user: User,
    projectId: string,
    fields: UploadEvidenceFields,
    file: UploadedFile | undefined,
  ): Promise<EvidenceItem> {
    if (!file) throw new BadRequestException('Attach a file in the "file" field');
    if (!isAllowedMimeType(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Upload a PDF, PNG, JPEG, CSV, XLSX or DOCX file');
    }
    if (!contentMatchesType(file.mimetype, file.buffer)) {
      throw new UnsupportedMediaTypeException('File content does not match its declared type');
    }
    const { rule, requirement } = await this.requirementFor(
      projectId,
      user,
      fields.ruleId,
      fields.requirementKey,
    );

    const id = randomUUID();
    const storagePath = await this.storage.save(projectId, id, file.buffer);
    let row: Evidence;
    try {
      row = await this.db.evidence.create({
        data: {
          id,
          projectId,
          ruleId: rule.ruleId,
          requirementKey: requirement.key,
          kind: requirement.kind,
          source: 'upload',
          fileName: sanitiseFileName(file.originalname),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sha256: sha256(file.buffer),
          storagePath,
          note: fields.note || null,
          uploadedById: user.id,
        },
      });
    } catch (error) {
      await this.storage.remove(storagePath);
      throw error;
    }
    await this.audit.record(
      projectId,
      user.id,
      'evidence.uploaded',
      `${requirement.title} uploaded for ${rule.code}`,
      {
        evidenceId: id,
        sha256: row.sha256,
      },
    );
    return toEvidenceItem(row, user.name);
  }

  /** Uses a selected catalog material's EPD / product data as evidence; fingerprints the record it relied on. */
  async linkMaterial(
    user: User,
    projectId: string,
    request: LinkMaterialEvidenceRequest,
  ): Promise<EvidenceItem> {
    const { evaluation, rule, requirement } = await this.requirementFor(
      projectId,
      user,
      request.ruleId,
      request.requirementKey,
    );
    const material = evaluation.selected.find((candidate) => candidate.id === request.materialId);
    if (!material) throw new BadRequestException('Select the material for this project before linking it');
    assertMaterialSatisfies(requirement, material.category, material.epd?.valid ?? false);

    const record = canonicalJson({
      material: {
        id: material.id,
        name: material.name,
        manufacturer: material.manufacturer,
        category: material.category,
      },
      epd: material.epd,
      gwp: material.gwp,
      gwpUnit: material.gwpUnit,
      attributes: material.attributes,
      supplier: { name: material.supplier.name, result: material.supplier.result },
    });
    const label = requirement.kind === 'EPD' ? `EPD ${material.epd!.number}` : 'product data';
    const row = await this.db.evidence.create({
      data: {
        projectId,
        ruleId: rule.ruleId,
        requirementKey: requirement.key,
        kind: requirement.kind,
        source: 'catalog',
        fileName: `${material.name} — ${label}.json`,
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(record),
        sha256: sha256(record),
        materialId: material.id,
        note: `Linked from the GreenForce material catalog (${material.supplier.name}).`,
        uploadedById: user.id,
      },
    });
    await this.audit.record(
      projectId,
      user.id,
      'evidence.linked',
      `${material.name} linked as ${requirement.title}`,
      {
        evidenceId: row.id,
        materialId: material.id,
      },
    );
    return toEvidenceItem(row, user.name);
  }

  async setVerified(
    user: User,
    projectId: string,
    evidenceId: string,
    verified: boolean,
  ): Promise<EvidenceItem> {
    await this.repository.findOwned(projectId, user.id);
    await this.findItem(projectId, evidenceId);
    const row = await this.db.evidence.update({
      where: { id: evidenceId },
      data: { verified, verifiedAt: verified ? new Date() : null },
      include: { uploadedBy: { select: { name: true } } },
    });
    await this.audit.record(
      projectId,
      user.id,
      verified ? 'evidence.verified' : 'evidence.unverified',
      `${row.fileName} ${verified ? 'marked verified' : 'verification withdrawn'}`,
      { evidenceId },
    );
    return toEvidenceItem(row, row.uploadedBy.name);
  }

  async remove(user: User, projectId: string, evidenceId: string): Promise<void> {
    await this.repository.findOwned(projectId, user.id);
    await this.findItem(projectId, evidenceId);
    const row = await this.db.evidence.delete({ where: { id: evidenceId } });
    if (row.storagePath) await this.storage.remove(row.storagePath);
    await this.audit.record(projectId, user.id, 'evidence.removed', `${row.fileName} removed`, {
      evidenceId,
      sha256: row.sha256,
    });
  }

  async download(user: User, projectId: string, evidenceId: string): Promise<EvidenceDownload> {
    await this.repository.findOwned(projectId, user.id);
    const row = await this.findItem(projectId, evidenceId);
    if (row.storagePath) {
      return {
        fileName: row.fileName,
        mimeType: row.mimeType,
        data: await this.storage.read(row.storagePath),
      };
    }
    // Catalog evidence: return the material record it was linked from.
    const selected = await this.repository.selectedMaterials(projectId);
    const material = selected.find((candidate) => candidate.id === row.materialId);
    return {
      fileName: row.fileName,
      mimeType: 'application/json',
      data: Buffer.from(
        JSON.stringify(
          { evidence: toEvidenceItem(row, row.uploadedBy.name), material: material ?? null },
          null,
          2,
        ),
      ),
    };
  }
  /** Evidence scoped to its project; 404 if it belongs elsewhere. */
  private async findItem(projectId: string, evidenceId: string) {
    const row = await this.db.evidence.findFirst({
      where: { id: evidenceId, projectId },
      include: { uploadedBy: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Evidence not found');
    return row;
  }
}

function assertMaterialSatisfies(
  requirement: EvidenceRequirement,
  category: string,
  epdValid: boolean,
): void {
  if (!requirement.materialCategories?.some((allowed) => allowed === category)) {
    throw new BadRequestException(
      `"${requirement.title}" cannot be satisfied by a ${category.replace('_', ' ')} product`,
    );
  }
  if (requirement.kind === 'EPD' && !epdValid) {
    throw new BadRequestException('This material has no valid EPD to link');
  }
}
