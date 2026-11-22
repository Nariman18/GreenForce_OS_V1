import { z } from 'zod';
import { IdSchema } from './common.js';

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserSchema = z.object({
  id: IdSchema,
  email: z.email(),
  name: z.string(),
  organization: z.string(),
});
export type User = z.infer<typeof UserSchema>;
