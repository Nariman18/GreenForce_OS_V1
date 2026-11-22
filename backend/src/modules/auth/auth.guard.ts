import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SESSION_COOKIE_NAME } from '@greenforce/shared';
import { type AuthenticatedRequest, IS_PUBLIC } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

/** Global guard: every route requires a valid session cookie unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE_NAME];
    const user = typeof token === 'string' ? await this.auth.userFromToken(token) : null;
    if (!user) throw new UnauthorizedException('Sign in to continue');

    request.user = user;
    return true;
  }
}
