import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomLoggerService } from '../../common/logger/logger.service';

@Catch()
export class AdminExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AdminExceptionFilter.name);

  constructor(private readonly customLogger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse();
    const request = ctx.getRequest();

    // Check if this is an admin request
    const isAdminRequest = request.url?.startsWith('/admin');

    // Use admin-specific error handling for all requests in this filter
    this.handleAdminError(exception, request, reply);
  }

  private handleAdminError(
    exception: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    let status: number;
    let message: string | string[];
    let error: string;
    let adminSpecificMessage = '';

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

      // Add admin-specific context for certain errors
      if (status === HttpStatus.FORBIDDEN) {
        adminSpecificMessage = 'Admin access denied. Check your role permissions.';
      } else if (status === HttpStatus.UNAUTHORIZED) {
        adminSpecificMessage = 'Admin authentication required. Please log in again.';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Admin operation failed';
      error = 'Admin Error';
      adminSpecificMessage = 'An error occurred during admin operation. Please try again.';

      // Log admin errors with higher priority
      this.logger.error(
        `Admin error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Admin operation failed';
      error = 'Admin Error';
      adminSpecificMessage = 'An unexpected error occurred in admin operations.';
    }

    // Enhanced logging for admin actions
    if (status >= 400) {
      const requestId = request.headers['x-request-id'] as string;
      const adminId = (request as any).user?.id;
      const adminRole = (request as any).user?.roleLevel;

      // Log admin errors with additional context
      this.customLogger.logBusinessEvent('admin_error', {
        adminId,
        adminRole,
        action: `${request.method} ${request.url}`,
        error: message,
        status,
        requestId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    }

    // Create admin-focused error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: adminSpecificMessage || this.formatAdminErrorMessage(message, status),
    };

    // Add request ID for tracing
    const requestId = request.headers['x-request-id'] as string;
    if (requestId) {
      errorResponse['requestId'] = requestId;
    }

    // Add admin context if available
    if ((request as any).user?.id) {
      errorResponse['adminId'] = (request as any).user.id;
      errorResponse['adminRole'] = (request as any).user.roleLevel;
    }

    reply.status(status).send(errorResponse);
  }

  private formatAdminErrorMessage(
    message: string | string[],
    status: number,
  ): string | string[] {
    // Admin-specific user-friendly messages
    if (status >= 400 && status < 500) {
      const adminMessages = {
        [HttpStatus.BAD_REQUEST]: 'Invalid admin request. Please check your input parameters.',
        [HttpStatus.UNAUTHORIZED]: 'Admin authentication failed. Please log in.',
        [HttpStatus.FORBIDDEN]: 'Insufficient admin permissions for this operation.',
        [HttpStatus.NOT_FOUND]: 'Admin resource not found.',
        [HttpStatus.CONFLICT]: 'Admin operation conflicts with current system state.',
        [HttpStatus.UNPROCESSABLE_ENTITY]: 'Admin request data is invalid.',
        [HttpStatus.TOO_MANY_REQUESTS]: 'Too many admin requests. Please slow down.',
      };

      return adminMessages[status] || message;
    }

    // For server errors in admin context
    if (status >= 500) {
      return 'Admin system error. Our team has been notified.';
    }

    return message;
  }
}