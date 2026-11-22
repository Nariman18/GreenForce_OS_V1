import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './db/prisma.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DemoModule } from './modules/demo/demo.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { FundingModule } from './modules/funding/funding.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MaterialsModule } from './modules/materials/materials.module.js';
import { PassportModule } from './modules/passport/passport.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { PropertiesModule } from './modules/properties/properties.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    PropertiesModule,
    ProjectsModule,
    EvidenceModule,
    MaterialsModule,
    FundingModule,
    PassportModule,
    DemoModule,
  ],
})
export class AppModule {}
