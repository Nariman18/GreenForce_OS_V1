import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  LoginRequestSchema,
  SESSION_COOKIE_NAME,
  type LoginRequest,
  type User,
  UserSchema,
} from '@greenforce/shared';
import type { CookieOptions, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/env.js';
import { CurrentUser, Public } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and receive an httpOnly session cookie' })
  @ApiResponse({ status: 200, standardSchema: UserSchema })
  async login(
    @Body({ schema: LoginRequestSchema }) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<User> {
    const { user, token } = await this.auth.login(body);
    res.cookie(SESSION_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: this.config.SESSION_TTL_HOURS * 60 * 60 * 1000,
    });
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, this.cookieOptions());
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user' })
  @ApiResponse({ status: 200, standardSchema: UserSchema })
  me(@CurrentUser() user: User): User {
    return user;
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.COOKIE_SECURE, path: '/' };
  }
}
