import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : 500;

    let message: string;
    if (isHttpException) {
      const httpResponse = exception.getResponse();
      if (typeof httpResponse === 'string') {
        message = httpResponse;
      } else if (
        typeof httpResponse === 'object' &&
        httpResponse !== null &&
        'message' in httpResponse
      ) {
        message = String(httpResponse.message);
      } else {
        message = 'HTTP Exception';
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal Server Error';
    } else {
      message = 'Unknown error occurred';
    }

    const stack = exception instanceof Error ? exception.stack : undefined;

    const responseBody: ErrorResponse = {
      message,
      data: {
        timestamp: new Date().toISOString(),
        status_code: status,
        path: request.url,
      },
    };

    // Include error stack if in development mode
    if (process.env.NODE_ENV !== 'production' && stack) {
      responseBody.data.stack = stack;
    }

    // Log the error with full context
    this.logger.error(`[${request.method}] ${request.url} - ${message}`, stack);

    response.status(status).json(responseBody);
  }
}
