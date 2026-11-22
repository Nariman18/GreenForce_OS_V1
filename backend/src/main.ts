import 'reflect-metadata';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { APP_CONFIG, type AppConfig, isDevelopmentSecret } from './config/env.js';

async function bootstrap(): Promise<void> {
  const production = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    // Structured JSON logs in production; readable logs during development.
    logger: new ConsoleLogger({ json: production, colors: !production, prefix: 'GreenForce' }),
  });
  configureApp(app);
  const config = app.get<AppConfig>(APP_CONFIG);
  if (isDevelopmentSecret(config.JWT_SECRET)) {
    new Logger('Security').warn(
      'JWT_SECRET is the development default from backend/.env.example — set a real secret outside local development.',
    );
  }
  await app.listen(config.API_PORT, '0.0.0.0');
  new Logger('Bootstrap').log(`API listening on :${config.API_PORT} (docs: /api/docs)`);
}

void bootstrap();
