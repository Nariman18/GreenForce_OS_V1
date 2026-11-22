import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { createPrismaClient, type Database, PRISMA } from './prisma.js';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createPrismaClient(config.DATABASE_URL),
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule implements OnApplicationShutdown {
  constructor(@Inject(PRISMA) private readonly prisma: Database) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
