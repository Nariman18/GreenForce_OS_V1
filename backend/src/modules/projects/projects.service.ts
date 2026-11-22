import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  CreateProjectRequest,
  ProjectDetail,
  ProjectMeasurements,
  ProjectSetup,
  ProjectSummary,
  User,
} from '@greenforce/shared';
import { type Database, PRISMA } from '../../db/prisma.js';
import { AuditService } from '../audit/audit.service.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { PropertiesService } from '../properties/properties.service.js';
import { ProjectsRepository } from './projects.repository.js';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    private readonly repository: ProjectsRepository,
    private readonly properties: PropertiesService,
    private readonly compliance: ComplianceService,
    private readonly audit: AuditService,
  ) {}

  async list(user: User): Promise<ProjectSummary[]> {
    const rows = await this.repository.listOwned(user.id);
    return Promise.all(
      rows.map(async (row) => {
        const { detail, result } = await this.compliance.evaluateRow(row);
        return {
          id: row.id,
          name: row.name,
          jurisdiction: detail.jurisdiction,
          greenforceId: detail.property.greenforceId,
          address: detail.property.address,
          readiness: result.readiness,
          openIssues: result.fixList.length,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
        };
      }),
    );
  }

  async create(user: User, request: CreateProjectRequest): Promise<ProjectDetail> {
    const property = await this.properties.upsert(request.jurisdiction, request.sourceRef);
    const row = await this.db.project.create({
      data: {
        ownerId: user.id,
        propertyId: property.id,
        name: request.name,
        jurisdiction: request.jurisdiction,
        setup: { jurisdiction: request.jurisdiction },
        measurements: { jurisdiction: request.jurisdiction },
      },
    });
    await this.audit.record(row.id, user.id, 'project.created', `Project created for ${property.address}`, {
      greenforceId: property.greenforceId,
    });
    return this.repository.detail(row);
  }

  async get(user: User, projectId: string): Promise<ProjectDetail> {
    return this.repository.detail(await this.repository.findOwned(projectId, user.id));
  }

  async updateSetup(user: User, projectId: string, setup: ProjectSetup): Promise<ProjectDetail> {
    const row = await this.repository.findOwned(projectId, user.id);
    assertJurisdiction(row.jurisdiction, setup.jurisdiction);
    const updated = await this.db.project.update({ where: { id: row.id }, data: { setup } });
    const declared = Object.keys(setup).filter((key) => key !== 'jurisdiction').length;
    await this.audit.record(
      row.id,
      user.id,
      'project.setup_updated',
      `Project setup saved (${declared} declarations)`,
    );
    return this.repository.detail(updated);
  }

  async updateMeasurements(
    user: User,
    projectId: string,
    measurements: ProjectMeasurements,
  ): Promise<ProjectDetail> {
    const row = await this.repository.findOwned(projectId, user.id);
    assertJurisdiction(row.jurisdiction, measurements.jurisdiction);
    const updated = await this.db.project.update({ where: { id: row.id }, data: { measurements } });
    await this.audit.record(row.id, user.id, 'project.measurements_updated', 'Design measurements updated');
    return this.repository.detail(updated);
  }
}

function assertJurisdiction(projectJurisdiction: string, bodyJurisdiction: string): void {
  if (projectJurisdiction !== bodyJurisdiction) {
    throw new BadRequestException(
      `This project is in ${projectJurisdiction}; ${bodyJurisdiction} declarations do not apply.`,
    );
  }
}
