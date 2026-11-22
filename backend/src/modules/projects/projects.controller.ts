import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type AuditEvent,
  AuditEventSchema,
  type ComplianceResult,
  ComplianceResultSchema,
  type CreateProjectRequest,
  CreateProjectRequestSchema,
  IdSchema,
  type ProjectDetail,
  ProjectDetailSchema,
  type ProjectMeasurements,
  ProjectMeasurementsSchema,
  type ProjectSetup,
  ProjectSetupSchema,
  type ProjectSummary,
  ProjectSummarySchema,
  type User,
} from '@greenforce/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly compliance: ComplianceService,
    private readonly repository: ProjectsRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current user's projects with readiness" })
  @ApiResponse({ status: 200, standardSchema: z.array(ProjectSummarySchema) })
  list(@CurrentUser() user: User): Promise<ProjectSummary[]> {
    return this.projects.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project for a resolved property (issues the GreenForce ID)' })
  @ApiResponse({ status: 201, standardSchema: ProjectDetailSchema })
  create(
    @CurrentUser() user: User,
    @Body({ schema: CreateProjectRequestSchema }) body: CreateProjectRequest,
  ): Promise<ProjectDetail> {
    return this.projects.create(user, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Project with property intelligence, setup and measurements' })
  @ApiResponse({ status: 200, standardSchema: ProjectDetailSchema })
  get(@CurrentUser() user: User, @Param('id', { schema: IdSchema }) id: string): Promise<ProjectDetail> {
    return this.projects.get(user, id);
  }

  @Put(':id/setup')
  @ApiOperation({ summary: 'Save the project setup declarations' })
  @ApiResponse({ status: 200, standardSchema: ProjectDetailSchema })
  updateSetup(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) id: string,
    @Body({ schema: ProjectSetupSchema }) body: ProjectSetup,
  ): Promise<ProjectDetail> {
    return this.projects.updateSetup(user, id, body);
  }

  @Put(':id/measurements')
  @ApiOperation({ summary: 'Save design measurements used by computed checks' })
  @ApiResponse({ status: 200, standardSchema: ProjectDetailSchema })
  updateMeasurements(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) id: string,
    @Body({ schema: ProjectMeasurementsSchema }) body: ProjectMeasurements,
  ): Promise<ProjectDetail> {
    return this.projects.updateMeasurements(user, id, body);
  }

  @Get(':id/compliance')
  @ApiOperation({ summary: 'Evaluate applicable requirements, verdicts, readiness and the fix list' })
  @ApiResponse({ status: 200, standardSchema: ComplianceResultSchema })
  async complianceResult(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) id: string,
  ): Promise<ComplianceResult> {
    return (await this.compliance.evaluateOwned(id, user.id)).result;
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Project audit trail, newest first' })
  @ApiResponse({ status: 200, standardSchema: z.array(AuditEventSchema) })
  async history(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) id: string,
  ): Promise<AuditEvent[]> {
    await this.repository.findOwned(id, user.id);
    return this.audit.list(id);
  }
}
