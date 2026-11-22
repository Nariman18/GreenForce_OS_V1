import { randomBytes } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { databaseUrl } from '../src/config/database-url.js';
import { loadConfig } from '../src/config/env.js';
import { createPrismaClient, type Database, PRISMA } from '../src/db/prisma.js';
import { seedDemo } from '../src/db/seed/seed.js';

export const DEMO_EMAIL = 'demo@greenforce.test';
export const DEMO_PASSWORD = 'test-demo-password';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../prisma/migrations');

export interface TestContext {
  app: INestApplication;
  db: Database;
  close(): Promise<void>;
}

/**
 * Applies the Prisma migration SQL inside the isolated schema. The statements are unqualified, so they run in one
 * transaction whose search_path points at the test schema.
 */
async function applyMigrations(db: Database, schema: string): Promise<void> {
  const folders = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const sql = await Promise.all(
    folders.map((folder) => readFile(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8')),
  );
  const statements = sql
    .join('\n')
    .split(';')
    .map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);
  await db.$transaction([
    db.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`),
    ...statements.map((statement) => db.$executeRawUnsafe(statement)),
  ]);
}

/**
 * Boots the real AppModule against PostgreSQL (TEST_DATABASE_URL, or the backend/.env(.example) settings),
 * isolated in a throwaway schema with migrations and demo seed applied. Start the database with
 * `docker compose up -d postgres`.
 */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  const uploadDir = await mkdtemp(path.join(os.tmpdir(), 'greenforce-uploads-'));
  const connectionString = process.env.TEST_DATABASE_URL ?? databaseUrl();
  const schema = `test_${randomBytes(6).toString('hex')}`;

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: connectionString,
    JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256',
    DEMO_USER_EMAIL: DEMO_EMAIL,
    DEMO_USER_PASSWORD: DEMO_PASSWORD,
    DEMO_MODE: 'false',
    UPLOAD_DIR: uploadDir,
    SWAGGER_ENABLED: 'true',
    ...env,
  });

  const admin = createPrismaClient(connectionString);
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } catch (error) {
    await admin.$disconnect();
    throw new Error(
      `Cannot reach PostgreSQL at ${connectionString.replace(/:[^:@/]*@/, ':***@')} — run "docker compose up -d postgres" or set TEST_DATABASE_URL.\n${String(error)}`,
    );
  }
  const db = createPrismaClient(connectionString, schema);
  let app: INestApplication | undefined;
  const close = async () => {
    await app?.close();
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    await rm(uploadDir, { recursive: true, force: true });
  };

  try {
    await applyMigrations(db, schema);
    await seedDemo(db, loadConfig());
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA)
      .useValue(db)
      .compile();
    app = configureApp(moduleRef.createNestApplication({ logger: false }));
    await app.init();
  } catch (error) {
    await close();
    throw error;
  }
  return { app, db, close };
}
