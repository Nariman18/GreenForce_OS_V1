import { z } from 'zod';
import { JURISDICTIONS } from '../constants/domain.js';

export const IdSchema = z.uuid();
export const IsoDateSchema = z.iso.date();
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const JurisdictionSchema = z.enum(JURISDICTIONS);

export const ProjectIdParamsSchema = z.object({ id: IdSchema });

export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.array(z.string()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  version: z.string(),
  demoMode: z.boolean(),
  time: IsoDateTimeSchema,
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
