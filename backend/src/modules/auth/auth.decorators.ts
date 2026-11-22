import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { User } from '@greenforce/shared';
import type { Request } from 'express';

export const IS_PUBLIC = 'isPublic';

/** Marks a route as reachable without a session. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AuthenticatedRequest = Request & { user: User };

/** Injects the user resolved by the AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
