import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type EvidenceItem,
  type EvidenceKind,
  type Jurisdiction,
  type Material,
  type ProjectDetail,
  ProjectMeasurementsSchema,
  ProjectSetupSchema,
} from '@greenforce/shared';
import type { Evidence, Project } from '../../generated/prisma/client.js';
import { todayIso } from '../../common/clock.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import type { EvaluationInput } from '../compliance/engine/types.js';
import { toEngineMaterial, toMaterial } from '../materials/material-mapper.js';
import { toPropertyRecord } from '../properties/properties.service.js';

export type ProjectRow = Project;

/** Data access for projects and the state the compliance engine evaluates. */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(PRISMA) private readonly db: Database) {}

  /** Returns the project if it exists and belongs to the user; 404 otherwise (no existence leak). */
  async findOwned(projectId: string, ownerId: string): Promise<ProjectRow> {
    const row = await this.db.project.findFirst({ where: { id: projectId, ownerId } });
    if (!row) throw new NotFoundException('Project not found');
    return row;
  }

  listOwned(ownerId: string): Promise<ProjectRow[]> {
    return this.db.project.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
  }

  async detail(row: ProjectRow): Promise<ProjectDetail> {
    const property = await this.db.property.findUniqueOrThrow({ where: { id: row.propertyId } });
    return {
      id: row.id,
      name: row.name,
      jurisdiction: row.jurisdiction as Jurisdiction,
      property: toPropertyRecord(property),
      setup: ProjectSetupSchema.parse(row.setup),
      measurements: ProjectMeasurementsSchema.parse(row.measurements),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async evidenceFor(projectId: string): Promise<EvidenceItem[]> {
    const rows = await this.db.evidence.findMany({
      where: { projectId },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toEvidenceItem(row, row.uploadedBy.name));
  }

  async selectedMaterials(projectId: string, today = todayIso()): Promise<Material[]> {
    const rows = await this.db.projectMaterial.findMany({
      where: { projectId },
      include: { material: { include: { supplier: true } } },
      orderBy: { selectedAt: 'asc' },
    });
    return rows.map(({ material }) => toMaterial(material, today));
  }

  /** Everything the engine needs for one project, read in one place. */
  async evaluationInput(
    row: ProjectRow,
  ): Promise<{ input: EvaluationInput; detail: ProjectDetail; selected: Material[] }> {
    const today = todayIso();
    const [detail, items, selected] = await Promise.all([
      this.detail(row),
      this.evidenceFor(row.id),
      this.selectedMaterials(row.id, today),
    ]);
    return {
      detail,
      selected,
      input: {
        projectId: row.id,
        setup: detail.setup,
        measurements: detail.measurements,
        property: { data: detail.property.data, overlays: detail.property.overlays },
        evidence: items,
        selectedMaterials: selected.map(toEngineMaterial),
        today,
      },
    };
  }

  async touch(projectId: string): Promise<void> {
    await this.db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  }
}

export function toEvidenceItem(row: Evidence, uploadedBy: string): EvidenceItem {
  return {
    id: row.id,
    ruleId: row.ruleId,
    requirementKey: row.requirementKey,
    kind: row.kind as EvidenceKind,
    source: row.source as EvidenceItem['source'],
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    note: row.note,
    materialId: row.materialId,
    verified: row.verified,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}
