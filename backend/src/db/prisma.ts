import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type Database = PrismaClient;

/** Injection token for the Prisma client (overridden in tests with a schema-isolated client). */
export const PRISMA = Symbol('PRISMA');

/** Prisma 7 connects through the node-postgres driver adapter; `schema` isolates test databases. */
export function createPrismaClient(connectionString: string, schema?: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }, schema ? { schema } : undefined) });
}
