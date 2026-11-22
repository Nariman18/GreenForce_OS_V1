import { defineConfig } from 'prisma/config';
import { databaseUrl } from './src/config/database-url.js';

// Prisma 7 does not load .env files itself. Real environment variables win; then .env; then the
// .env.example development defaults (process.loadEnvFile never overrides variables that are already set).
for (const file of ['.env', '.env.example']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // optional file
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() },
});
