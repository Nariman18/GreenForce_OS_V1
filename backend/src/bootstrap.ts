import { BadRequestException, type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, SESSION_COOKIE_NAME } from '@greenforce/shared';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { APP_CONFIG, type AppConfig } from './config/env.js';

/** Shared HTTP setup for main.ts and integration tests, so tests exercise the real pipeline. */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<AppConfig>(APP_CONFIG);
  const express = app as NestExpressApplication;

  express.set('trust proxy', 1);
  express.disable('x-powered-by');
  express.useBodyParser('json', { limit: '1mb' });
  app.use(helmet());
  app.use(cookieParser());
  // The web app reaches the API same-origin via a Next.js rewrite; CORS only matters for direct API access.
  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: (issues) =>
        new BadRequestException({
          message: 'Validation failed',
          details: issues.map((issue) => {
            const path = issue.path
              ?.map((segment) => (typeof segment === 'object' ? segment.key : segment))
              .join('.');
            return path ? `${path}: ${issue.message}` : issue.message;
          }),
        }),
    }),
  );
  app.enableShutdownHooks();

  if (config.SWAGGER_ENABLED) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('GreenForce OS API')
        .setDescription(
          'Jurisdiction-aware construction compliance: property intelligence, rule evaluation, evidence, materials and passports. Sign in via POST /auth/login to receive the session cookie.',
        )
        .setVersion('0.1.0')
        .addCookieAuth(SESSION_COOKIE_NAME)
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs/openapi.json' });
  }
  return app;
}
