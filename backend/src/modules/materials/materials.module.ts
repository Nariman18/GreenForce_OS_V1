import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
