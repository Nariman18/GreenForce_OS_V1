import { Module } from '@nestjs/common';
import { ComplianceService } from '../compliance/compliance.service.js';
import { PropertiesModule } from '../properties/properties.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

/** Projects and their on-read compliance evaluation (kept together: listing needs readiness). */
@Module({
  imports: [PropertiesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, ComplianceService],
  exports: [ProjectsRepository, ComplianceService],
})
export class ProjectsModule {}
