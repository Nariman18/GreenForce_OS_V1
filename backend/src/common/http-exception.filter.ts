import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@greenforce/shared';
import type { Response } from 'express';

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/** Normalises every error into the shared ApiError shape and never leaks internals for 5xx. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toApiError(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const error = STATUS_TEXT[statusCode] ?? 'Error';
      if (typeof raw === 'string') return { statusCode, error, message: raw };

      const { message, details } = raw as { message?: string | string[]; details?: string[] };
      if (Array.isArray(message)) {
        return { statusCode, error, message: 'Validation failed', details: message };
      }
      return {
        statusCode,
        error,
        message: statusCode >= 500 ? 'Internal server error' : (message ?? error),
        ...(details ? { details } : {}),
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: STATUS_TEXT[500]!,
      message: 'Internal server error',
    };
  }
}
