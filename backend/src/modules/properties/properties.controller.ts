import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  JurisdictionSchema,
  PropertyCandidateSchema,
  type PropertyCandidate,
  type PropertyPreview,
  PropertyPreviewSchema,
  type PropertySearchQuery,
  PropertySearchQuerySchema,
} from '@greenforce/shared';
import { z } from 'zod';
import { PropertiesService } from './properties.service.js';

const ResolveQuerySchema = z.object({
  jurisdiction: JurisdictionSchema,
  sourceRef: z.string().min(1).max(64),
});

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search addresses in a jurisdiction' })
  @ApiResponse({ status: 200, standardSchema: z.array(PropertyCandidateSchema) })
  search(
    @Query({ schema: PropertySearchQuerySchema }) query: PropertySearchQuery,
  ): Promise<PropertyCandidate[]> {
    return this.properties.search(query.jurisdiction, query.q);
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve a search candidate into property intelligence (not persisted)' })
  @ApiResponse({ status: 200, standardSchema: PropertyPreviewSchema })
  resolve(
    @Query({ schema: ResolveQuerySchema }) query: z.infer<typeof ResolveQuerySchema>,
  ): Promise<PropertyPreview> {
    return this.properties.preview(query.jurisdiction, query.sourceRef);
  }
}
