import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  IdSchema,
  type Material,
  type MaterialListQuery,
  MaterialListQuerySchema,
  MaterialSchema,
  type ProjectMaterialsResponse,
  ProjectMaterialsResponseSchema,
  type User,
} from '@greenforce/shared';
import { z } from 'zod';
import { CurrentUser } from '../auth/auth.decorators.js';
import { MaterialsService } from './materials.service.js';

@ApiTags('materials')
@Controller()
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get('materials')
  @ApiOperation({ summary: 'Material & supplier catalog' })
  @ApiResponse({ status: 200, standardSchema: z.array(MaterialSchema) })
  list(@Query({ schema: MaterialListQuerySchema }) query: MaterialListQuery): Promise<Material[]> {
    return this.materials.list(query);
  }

  @Get('projects/:id/materials')
  @ApiOperation({ summary: "Materials scored against the project's applicable requirements" })
  @ApiResponse({ status: 200, standardSchema: ProjectMaterialsResponseSchema })
  recommendations(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
  ): Promise<ProjectMaterialsResponse> {
    return this.materials.recommendations(user, projectId);
  }

  @Post('projects/:id/materials/:materialId')
  @ApiOperation({ summary: 'Select a material for the project' })
  @ApiResponse({ status: 201, standardSchema: ProjectMaterialsResponseSchema })
  select(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('materialId', { schema: IdSchema }) materialId: string,
  ): Promise<ProjectMaterialsResponse> {
    return this.materials.select(user, projectId, materialId);
  }

  @Delete('projects/:id/materials/:materialId')
  @ApiOperation({ summary: 'Remove a material from the project selection' })
  @ApiResponse({ status: 200, standardSchema: ProjectMaterialsResponseSchema })
  deselect(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('materialId', { schema: IdSchema }) materialId: string,
  ): Promise<ProjectMaterialsResponse> {
    return this.materials.deselect(user, projectId, materialId);
  }
}
