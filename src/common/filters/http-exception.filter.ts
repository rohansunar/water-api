import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { CustomLoggerService } from '../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly customLogger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Log the actual error for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error(
        `Unknown exception: ${JSON.stringify(exception)}`,
        undefined,
        `${request.method} ${request.url}`,
      );
    }

    // Enhanced logging with custom logger
    if (status >= 400) {
      const requestId = request.headers['x-request-id'] as string;
      const userId = (request as any).user?.id;

      // Use custom logger for API errors
      this.customLogger.logApiError(
        request.url,
        request.method,
        status,
        exception,
        userId,
        requestId,
      );

      // Also log validation errors specifically
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
        message.forEach((msg) => {
          this.customLogger.logValidationError(
            'request',
            msg,
            'validation_failed',
            userId,
          );
        });
      }
    }

    // Create user-friendly error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: this.formatErrorMessage(message, status),
    };

    // Add request ID if available (for tracing)
    const requestId = request.headers['x-request-id'] as string;
    if (requestId) {
      errorResponse['requestId'] = requestId;
    }

    response.status(status).json(errorResponse);
  }

  private formatErrorMessage(
    message: string | string[],
    status: number,
  ): string | string[] {
    // For validation errors, return the detailed messages
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      return message;
    }

    // For other client errors, return user-friendly messages
    if (status >= 400 && status < 500) {
      const userFriendlyMessages = {
        [HttpStatus.BAD_REQUEST]: 'Invalid request. Please check your input.',
        [HttpStatus.UNAUTHORIZED]: 'Authentication required. Please log in.',
        [HttpStatus.FORBIDDEN]:
          'Access denied. You do not have permission to perform this action.',
        [HttpStatus.NOT_FOUND]: 'The requested resource was not found.',
        [HttpStatus.CONFLICT]:
          'The request conflicts with the current state of the resource.',
        [HttpStatus.UNPROCESSABLE_ENTITY]:
          'The request was well-formed but contains invalid data.',
        [HttpStatus.TOO_MANY_REQUESTS]:
          'Too many requests. Please try again later.',
      };

      return userFriendlyMessages[status] || message;
    }

    // For server errors, return generic message
    if (status >= 500) {
      return 'An internal server error occurred. Please try again later.';
    }

    return message;
  }
}
