import { loadConfig } from '../config/env.js';
import { createPrismaClient } from './prisma.js';
import { seedDemo } from './seed/seed.js';

const COMMANDS = ['seed', 'reset'] as const;
type Command = (typeof COMMANDS)[number];

async function main(command: Command): Promise<void> {
  const config = loadConfig();
  const prisma = createPrismaClient(config.DATABASE_URL);
  try {
    const result = await seedDemo(prisma, config, { reset: command === 'reset' });
    if (result) {
      console.warn(
        `✓ demo data seeded: ${result.projects} projects, ${result.materials} materials for ${result.user.email}`,
      );
    } else {
      console.warn('• demo data already present — skipped (use "reset" to recreate)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

const command = process.argv[2] as Command;
if (!COMMANDS.includes(command)) {
  console.error(`Usage: node dist/db/cli.js <${COMMANDS.join('|')}>`);
  process.exit(1);
}
main(command).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
