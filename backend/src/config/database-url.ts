/**
 * PostgreSQL connection string: DATABASE_URL if set, otherwise built from POSTGRES_* variables
 * (the same variables the postgres container uses, with POSTGRES_HOST overridden in compose).
 * Kept dependency-free so prisma.config.ts can import it too.
 */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const user = encodeURIComponent(env.POSTGRES_USER ?? 'greenforce');
  const password = encodeURIComponent(env.POSTGRES_PASSWORD ?? '');
  const host = env.POSTGRES_HOST ?? 'localhost';
  const port = env.POSTGRES_PORT ?? '5432';
  const database = env.POSTGRES_DB ?? 'greenforce';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
