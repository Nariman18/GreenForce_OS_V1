import { Controller, Get, Inject, Module, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type HealthResponse, HealthResponseSchema } from '@greenforce/shared';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/env.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { Public } from '../auth/auth.decorators.js';

const VERSION = process.env.npm_package_version ?? '0.1.0';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  @ApiResponse({ status: 200, standardSchema: HealthResponseSchema })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    let database: HealthResponse['database'] = 'up';
    try {
      await this.db.$queryRaw`select 1`;
    } catch {
      database = 'down';
      res.status(503);
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      version: VERSION,
      demoMode: this.config.DEMO_MODE,
      time: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
