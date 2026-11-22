import { Body, Controller, Get, Module, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  IdSchema,
  type IssueSnapshotRequest,
  IssueSnapshotRequestSchema,
  type LivePassport,
  LivePassportSchema,
  type PassportSnapshot,
  PassportSnapshotSchema,
  type PassportSnapshotSummary,
  PassportSnapshotSummarySchema,
  type User,
} from '@greenforce/shared';
import { z } from 'zod';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { PassportService } from './passport.service.js';

@ApiTags('passport')
@Controller('projects/:id/passport')
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  @Get()
  @ApiOperation({ summary: 'Live compliance passport with its current fingerprint' })
  @ApiResponse({ status: 200, standardSchema: LivePassportSchema })
  live(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
  ): Promise<LivePassport> {
    return this.passport.live(user, projectId);
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Issued passport versions, newest first' })
  @ApiResponse({ status: 200, standardSchema: z.array(PassportSnapshotSummarySchema) })
  list(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
  ): Promise<PassportSnapshotSummary[]> {
    return this.passport.listSnapshots(user, projectId);
  }

  @Post('snapshots')
  @ApiOperation({ summary: 'Issue an immutable passport version' })
  @ApiResponse({ status: 201, standardSchema: PassportSnapshotSummarySchema })
  issue(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Body({ schema: IssueSnapshotRequestSchema }) body: IssueSnapshotRequest,
  ): Promise<PassportSnapshotSummary> {
    return this.passport.issue(user, projectId, body.note);
  }

  @Get('snapshots/:version')
  @ApiOperation({ summary: 'A specific issued passport version with its frozen content' })
  @ApiResponse({ status: 200, standardSchema: PassportSnapshotSchema })
  get(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('version', { schema: z.coerce.number().int().positive() }) version: number,
  ): Promise<PassportSnapshot> {
    return this.passport.getSnapshot(user, projectId, version);
  }
}

@Module({
  imports: [ProjectsModule],
  controllers: [PassportController],
  providers: [PassportService],
})
export class PassportModule {}
