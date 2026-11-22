import { Controller, HttpCode, HttpStatus, Inject, Module, NotFoundException, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_CONFIG, type AppConfig } from '../../config/env.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { seedDemo } from '../../db/seed/seed.js';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restore the seeded demo state (only when DEMO_MODE=true)' })
  async reset(): Promise<void> {
    // Behaves as if the route does not exist outside demo mode.
    if (!this.config.DEMO_MODE) throw new NotFoundException();
    await seedDemo(this.db, this.config, { reset: true });
  }
}

@Module({ controllers: [DemoController] })
export class DemoModule {}
