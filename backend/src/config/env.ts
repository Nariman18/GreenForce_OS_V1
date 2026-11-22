import { z } from 'zod';
import { databaseUrl } from './database-url.js';

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(8),
  COOKIE_SECURE: booleanFlag.default(false),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DEMO_MODE: booleanFlag.default(false),
  DEMO_USER_EMAIL: z.email().default('demo@greenforce.dev'),
  DEMO_USER_PASSWORD: z.string().min(8).optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  SWAGGER_ENABLED: booleanFlag.default(true),
});

export type AppConfig = z.infer<typeof EnvSchema> & { DATABASE_URL: string };

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Parses process.env once; fails fast with a readable message instead of booting misconfigured. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return { ...result.data, DATABASE_URL: databaseUrl(env) };
}

/** Marker shared with backend/.env.example so a forgotten development secret is visible in the logs. */
export const isDevelopmentSecret = (secret: string) => secret.startsWith('dev-only-');
