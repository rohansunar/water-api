import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from 'class-validator';
import { CustomLoggerService } from '../logger/logger.service';
import { MongoError } from 'mongodb';
import {
  BusinessException,
  ErrorCategory,
  ErrorSeverity,
  DatabaseException,
  ExternalServiceException,
  ConfigurationException,
} from '../exceptions/business.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly customLogger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse();
    const request = ctx.getRequest();

    let status: number;
    let message: string | string[];
    let error: string;
    let errorCode: string;
    let category: ErrorCategory;
    let severity: ErrorSeverity;
    let context: any = {};
    let retryable: boolean = false;

    // Handle BusinessException with enhanced error information
    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      message = exception.message;
      error = exception.name;
      errorCode = exception.errorCode;
      category = exception.category;
      severity = exception.severity;
      context = exception.context;
      retryable = exception.retryable;

      // Enhanced logging for business exceptions
      this.customLogger.logApiError(
        request.url,
        request.method,
        status,
        exception,
        context.userId,
        context.requestId,
      );

      // Log specific error types with additional context
      if (category === ErrorCategory.DATABASE) {
        this.customLogger.logDatabaseOperation(
          context.operation || 'unknown',
          'database',
          0,
          false,
          {
            error: exception.message,
            errorCode: exception.errorCode,
            retryable,
          },
        );
      } else if (category === ErrorCategory.EXTERNAL_SERVICE) {
        this.customLogger.logInterModuleCommunication(
          'api',
          context.service || 'external_service',
          'external_call',
          0,
          false,
          {
            message: exception.message,
            errorCode: exception.errorCode,
          },
        );
      }
    } else if (exception instanceof HttpException) {
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

      // Categorize standard HTTP exceptions
      errorCode = this.categorizeHttpException(status);
      category = this.getErrorCategory(status);
      severity = this.getErrorSeverity(status);

      // Log standard HTTP exceptions
      this.customLogger.logApiError(
        request.url,
        request.method,
        status,
        exception,
        request.user?.id,
        request.headers['x-request-id'] as string,
      );
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      errorCode = 'INTERNAL_SERVER_ERROR';
      category = ErrorCategory.SYSTEM;
      severity = ErrorSeverity.CRITICAL;
      retryable = false;

      // Log the actual error for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );

      // Enhanced logging for unhandled errors
      this.customLogger.logApiError(
        request.url,
        request.method,
        status,
        exception,
        request.user?.id,
        request.headers['x-request-id'] as string,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      errorCode = 'UNKNOWN_ERROR';
      category = ErrorCategory.SYSTEM;
      severity = ErrorSeverity.CRITICAL;
      retryable = false;

      this.logger.error(
        `Unknown exception: ${JSON.stringify(exception)}`,
        undefined,
        `${request.method} ${request.url}`,
      );

      // Enhanced logging for unknown exceptions
      this.customLogger.logApiError(
        request.url,
        request.method,
        status,
        exception,
        request.user?.id,
        request.headers['x-request-id'] as string,
      );
    }

    // Enhanced logging with custom logger
    if (status >= 400) {
      const requestId = request.headers['x-request-id'] as string;
      const userId = request.user?.id;

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

    // Create structured error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        code: errorCode,
        message: this.formatErrorMessage(message, status),
        category,
        severity,
        retryable,
        context,
      },
    };

    // Add request ID if available (for tracing)
    const requestId = request.headers['x-request-id'] as string;
    if (requestId) {
      errorResponse.error['requestId'] = requestId;
    }

    // Add user ID if available
    if (request.user?.id) {
      errorResponse.error['userId'] = request.user.id;
    }

    // Use NestJS response methods for compatibility with both Express and Fastify
    reply.status(status).send(errorResponse);
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

      // For 401 errors, preserve specific messages if they are not the default 'Unauthorized'
      if (status === HttpStatus.UNAUTHORIZED && message !== 'Unauthorized') {
        return message;
      }

      return userFriendlyMessages[status] || message;
    }

    // For server errors, return generic message
    if (status >= 500) {
      return 'An internal server error occurred. Please try again later.';
    }

    return message;
  }

  /**
   * Categorize HTTP status codes into error categories
   */
  private categorizeHttpException(status: number): string {
    if (status >= 400 && status < 500) {
      const statusMap: Record<number, string> = {
        400: 'VALIDATION_ERROR',
        401: 'AUTHENTICATION_ERROR',
        403: 'AUTHORIZATION_ERROR',
        404: 'NOT_FOUND_ERROR',
        409: 'CONFLICT_ERROR',
        422: 'VALIDATION_ERROR',
        429: 'RATE_LIMIT_ERROR',
      };
      return statusMap[status] || 'CLIENT_ERROR';
    } else if (status >= 500) {
      return 'SERVER_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get error category based on HTTP status
   */
  private getErrorCategory(status: number): ErrorCategory {
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      return ErrorCategory.AUTHENTICATION;
    } else if (
      status === HttpStatus.BAD_REQUEST ||
      status === HttpStatus.UNPROCESSABLE_ENTITY
    ) {
      return ErrorCategory.VALIDATION;
    } else if (status === HttpStatus.NOT_FOUND) {
      return ErrorCategory.BUSINESS_LOGIC;
    } else if (status >= 500) {
      return ErrorCategory.SYSTEM;
    }
    return ErrorCategory.BUSINESS_LOGIC;
  }

  /**
   * Get error severity based on HTTP status
   */
  private getErrorSeverity(status: number): ErrorSeverity {
    if (
      status === HttpStatus.INTERNAL_SERVER_ERROR ||
      status === HttpStatus.BAD_GATEWAY
    ) {
      return ErrorSeverity.CRITICAL;
    } else if (
      status === HttpStatus.UNAUTHORIZED ||
      status === HttpStatus.FORBIDDEN
    ) {
      return ErrorSeverity.HIGH;
    } else if (status >= 500) {
      return ErrorSeverity.HIGH;
    } else if (
      status === HttpStatus.NOT_FOUND ||
      status === HttpStatus.CONFLICT
    ) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }
}
