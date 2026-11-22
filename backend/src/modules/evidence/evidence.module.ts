import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { EvidenceController } from './evidence.controller.js';
import { EvidenceService } from './evidence.service.js';
import { FileStorageService } from './file-storage.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, FileStorageService],
  exports: [FileStorageService],
})
export class EvidenceModule {}
