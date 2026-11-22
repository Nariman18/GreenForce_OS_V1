import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Material,
  MaterialListQuery,
  MaterialRecommendation,
  ProjectMaterialsResponse,
  User,
} from '@greenforce/shared';
import { todayIso } from '../../common/clock.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { AuditService } from '../audit/audit.service.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { materialFits } from '../compliance/engine/engine.js';
import { ProjectsRepository } from '../projects/projects.repository.js';
import { toEngineMaterial, toMaterial } from './material-mapper.js';

@Injectable()
export class MaterialsService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    private readonly compliance: ComplianceService,
    private readonly repository: ProjectsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: MaterialListQuery = {}): Promise<Material[]> {
    const today = todayIso();
    const rows = await this.db.material.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.jurisdiction ? { regions: { has: query.jurisdiction } } : {}),
      },
      include: { supplier: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => toMaterial(row, today));
  }

  /**
   * Compliance → materials → suppliers: catalog materials scored against the rules that apply to this project.
   * Only materials related to at least one applicable rule (or already selected) are returned.
   */
  async recommendations(user: User, projectId: string): Promise<ProjectMaterialsResponse> {
    const { input, result, selected } = await this.compliance.evaluateOwned(projectId, user.id);
    const selectedIds = new Set(selected.map((material) => material.id));
    const catalog = await this.list({ jurisdiction: input.setup.jurisdiction });

    const recommendations: MaterialRecommendation[] = catalog
      .map((material) => {
        const fits = materialFits(input, toEngineMaterial(material), result);
        const warnings = materialWarnings(material);
        const scored = fits.filter((fit) => fit.result !== 'INFO');
        const recommended =
          fits.length > 0 &&
          scored.every((fit) => fit.result === 'PASS') &&
          material.epd?.valid !== false &&
          material.supplier.counted &&
          material.supplier.result !== 'NOT_QUALIFIED';
        return { material, fits, recommended, selected: selectedIds.has(material.id), warnings };
      })
      .filter((entry) => entry.fits.length > 0 || entry.selected)
      .sort(
        (a, b) =>
          Number(b.recommended) - Number(a.recommended) ||
          a.material.category.localeCompare(b.material.category) ||
          (a.material.gwp ?? Infinity) - (b.material.gwp ?? Infinity),
      );

    return { recommendations, selectedCount: selectedIds.size };
  }

  async select(user: User, projectId: string, materialId: string): Promise<ProjectMaterialsResponse> {
    const project = await this.repository.findOwned(projectId, user.id);
    const material = await this.findMaterial(materialId);
    if (!material.regions.includes(project.jurisdiction as Material['regions'][number])) {
      throw new BadRequestException(`${material.name} is not available in this jurisdiction`);
    }
    const inserted = await this.db.projectMaterial.createMany({
      data: [{ projectId, materialId }],
      skipDuplicates: true,
    });
    if (inserted.count) {
      await this.repository.touch(projectId);
      await this.audit.record(
        projectId,
        user.id,
        'material.selected',
        `${material.name} selected (${material.supplier.name})`,
        {
          materialId,
        },
      );
    }
    return this.recommendations(user, projectId);
  }

  async deselect(user: User, projectId: string, materialId: string): Promise<ProjectMaterialsResponse> {
    await this.repository.findOwned(projectId, user.id);
    const removed = await this.db.projectMaterial.deleteMany({ where: { projectId, materialId } });
    if (removed.count) {
      const material = await this.findMaterial(materialId);
      await this.repository.touch(projectId);
      await this.audit.record(
        projectId,
        user.id,
        'material.deselected',
        `${material.name} removed from selection`,
        {
          materialId,
        },
      );
    }
    return this.recommendations(user, projectId);
  }

  private async findMaterial(materialId: string): Promise<Material> {
    const row = await this.db.material.findUnique({ where: { id: materialId }, include: { supplier: true } });
    if (!row) throw new NotFoundException('Material not found');
    return toMaterial(row, todayIso());
  }
}

function materialWarnings(material: Material): string[] {
  const warnings: string[] = [];
  if (!material.epd) warnings.push('No EPD — environmental performance cannot be documented.');
  else if (!material.epd.valid)
    warnings.push(`EPD ${material.epd.number} expired on ${material.epd.validTo}.`);
  if (!material.supplier.counted) {
    warnings.push(
      `Supplier documentation expired on ${material.supplier.documentationValidTo} — not currently counted.`,
    );
  }
  if (material.supplier.result === 'NOT_QUALIFIED') warnings.push('Supplier is not qualified.');
  if (material.supplier.additionalInfoRequired) {
    warnings.push(
      `Supplier must provide: ${material.supplier.additionalInfoNote ?? 'additional information'}.`,
    );
  }
  return warnings;
}
