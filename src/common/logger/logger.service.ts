import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), 'logs');

    // Configure winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'water-jar-delivery-api' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(
              ({ timestamp, level, message, context, stack }) => {
                const contextStr = context ? `[${context}] ` : '';
                const stackStr = stack ? `\n${stack}` : '';
                return `${timestamp} ${level}: ${contextStr}${message}${stackStr}`;
              },
            ),
          ),
        }),

        // File transport for all logs
        new DailyRotateFile({
          filename: join(logsDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),

        // Separate file for errors
        new DailyRotateFile({
          filename: join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),

        // Separate file for HTTP requests
        new DailyRotateFile({
          filename: join(logsDir, 'http-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: join(logsDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
      }),
    );

    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: join(logsDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
      }),
    );
  }

  log(message: any, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: any, stack?: string, context?: string): void {
    this.logger.error(message, { context, stack });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context });
  }

  // Custom methods for specific log types
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
  ): void {
    this.logger.info('HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: { userId?: string; requestId?: string; correlationId?: string },
  ): void {
    this.logger.info('API Request', {
      type: 'api_request',
      method,
      url,
      statusCode,
      duration,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessEvent(event: string, data: any, userId?: string): void {
    this.logger.info('Business Event', {
      type: 'business_event',
      event,
      data,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  logSecurityEvent(
    event: string,
    details: any,
    ip?: string,
    userAgent?: string,
  ): void {
    this.logger.warn('Security Event', {
      type: 'security_event',
      event,
      details,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  logDatabaseOperation(
    operation: string,
    collection: string,
    duration: number,
    success: boolean,
    error?: any,
  ): void {
    const logLevel = success ? 'info' : 'error';
    this.logger.log(logLevel, 'Database Operation', {
      type: 'database_operation',
      operation,
      collection,
      duration,
      success,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: error.code,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  logApiError(
    endpoint: string,
    method: string,
    statusCode: number,
    error: any,
    userId?: string,
    requestId?: string,
  ): void {
    this.logger.error('API Error', {
      type: 'api_error',
      endpoint,
      method,
      statusCode,
      userId,
      requestId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      timestamp: new Date().toISOString(),
    });
  }

  logValidationError(
    field: string,
    value: any,
    constraint: string,
    userId?: string,
  ): void {
    this.logger.warn('Validation Error', {
      type: 'validation_error',
      field,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
      constraint,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any): void {
    this.logger.info('Performance Metric', {
      type: 'performance',
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Enhanced methods for modular architecture
  logModuleAction(
    module: string,
    action: string,
    data?: any,
    context?: { userId?: string; requestId?: string; correlationId?: string },
  ): void {
    this.logger.info('Module Action', {
      type: 'module_action',
      module,
      action,
      data,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  logEvent(
    eventType: string,
    eventData: any,
    context?: { source?: string; correlationId?: string; userId?: string },
  ): void {
    this.logger.info('Event Published', {
      type: 'event',
      eventType,
      eventData,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  logInterModuleCommunication(
    sourceModule: string,
    targetModule: string,
    operation: string,
    duration?: number,
    success?: boolean,
    error?: any,
  ): void {
    const logLevel = success === false ? 'error' : 'info';
    this.logger.log(logLevel, 'Inter-Module Communication', {
      type: 'inter_module_communication',
      sourceModule,
      targetModule,
      operation,
      duration,
      success,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  logMemoryUsage(module: string, memoryUsage: NodeJS.MemoryUsage): void {
    this.logger.debug('Memory Usage', {
      type: 'memory_usage',
      module,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      timestamp: new Date().toISOString(),
    });
  }

  logAuditEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): void {
    this.logger.info('Audit Event', {
      type: 'audit_event',
      action,
      resourceType,
      resourceId,
      userId,
      oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
      newValues: newValues ? JSON.stringify(newValues) : undefined,
      metadata,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logAuthenticationEvent(
    event:
      | 'LOGIN_SUCCESS'
      | 'LOGIN_FAILED'
      | 'LOGOUT'
      | 'TOKEN_REFRESH'
      | 'PASSWORD_CHANGE',
    userId: string,
    details: any,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): void {
    const logLevel = event === 'LOGIN_FAILED' ? 'warn' : 'info';
    this.logger.log(logLevel, 'Authentication Event', {
      type: 'auth_event',
      event,
      userId,
      details,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logAuthorizationEvent(
    event: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'PERMISSION_CHANGED',
    userId: string,
    resource: string,
    details: any,
    ip?: string,
    userAgent?: string,
    requestId?: string,
  ): void {
    const logLevel = event === 'ACCESS_DENIED' ? 'warn' : 'info';
    this.logger.log(logLevel, 'Authorization Event', {
      type: 'authz_event',
      event,
      userId,
      resource,
      details,
      ip,
      userAgent,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessTransaction(
    transactionType: string,
    transactionId: string,
    userId: string,
    amount?: number,
    currency?: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' = 'SUCCESS',
    metadata?: any,
    requestId?: string,
  ): void {
    const logLevel = status === 'FAILED' ? 'error' : 'info';
    this.logger.log(logLevel, 'Business Transaction', {
      type: 'business_transaction',
      transactionType,
      transactionId,
      userId,
      amount,
      currency,
      status,
      metadata,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logPaymentEvent(
    event:
      | 'PAYMENT_INITIATED'
      | 'PAYMENT_SUCCESS'
      | 'PAYMENT_FAILED'
      | 'REFUND_INITIATED'
      | 'REFUND_SUCCESS'
      | 'REFUND_FAILED',
    paymentId: string,
    userId: string,
    amount: number,
    currency: string,
    gateway?: string,
    metadata?: any,
    requestId?: string,
  ): void {
    const logLevel = event.includes('FAILED') ? 'error' : 'info';
    this.logger.log(logLevel, 'Payment Event', {
      type: 'payment_event',
      event,
      paymentId,
      userId,
      amount,
      currency,
      gateway,
      metadata,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logOrderEvent(
    event:
      | 'ORDER_CREATED'
      | 'ORDER_UPDATED'
      | 'ORDER_CANCELLED'
      | 'ORDER_DELIVERED'
      | 'ORDER_RETURNED',
    orderId: string,
    userId: string,
    details: any,
    metadata?: any,
    requestId?: string,
  ): void {
    this.logger.info('Order Event', {
      type: 'order_event',
      event,
      orderId,
      userId,
      details,
      metadata,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logDeliveryEvent(
    event:
      | 'DELIVERY_SCHEDULED'
      | 'DELIVERY_STARTED'
      | 'DELIVERY_COMPLETED'
      | 'DELIVERY_FAILED',
    deliveryId: string,
    riderId: string,
    orderId: string,
    details: any,
    metadata?: any,
    requestId?: string,
  ): void {
    this.logger.info('Delivery Event', {
      type: 'delivery_event',
      event,
      deliveryId,
      riderId,
      orderId,
      details,
      metadata,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logErrorAggregation(
    errorType: string,
    errorCount: number,
    timeWindow: string,
    details: any,
    threshold?: number,
  ): void {
    const shouldAlert = threshold && errorCount >= threshold;

    this.logger.warn('Error Aggregation', {
      type: 'error_aggregation',
      errorType,
      errorCount,
      timeWindow,
      details,
      threshold,
      alert: shouldAlert,
      timestamp: new Date().toISOString(),
    });

    // Log as error if threshold exceeded
    if (shouldAlert) {
      this.logger.error('Error Threshold Exceeded', {
        type: 'error_threshold_exceeded',
        errorType,
        errorCount,
        threshold,
        timeWindow,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logPerformanceMetric(
    metricName: string,
    value: number,
    unit: string,
    context?: string,
    metadata?: any,
    requestId?: string,
  ): void {
    this.logger.info('Performance Metric', {
      type: 'performance_metric',
      metricName,
      value,
      unit,
      context,
      metadata,
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Log slow operations as warnings
    if (
      metricName.includes('duration') ||
      metricName.includes('response_time')
    ) {
      if (value > 5000) {
        // 5 seconds
        this.logger.warn('Slow Operation Detected', {
          type: 'slow_operation',
          metricName,
          value,
          unit,
          context,
          metadata,
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  logSystemHealth(
    component: string,
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
    metrics: any,
    details?: string,
    requestId?: string,
  ): void {
    const logLevel =
      status === 'HEALTHY' ? 'info' : status === 'DEGRADED' ? 'warn' : 'error';

    this.logger.log(logLevel, 'System Health', {
      type: 'system_health',
      component,
      status,
      metrics,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logRateLimitEvent(
    identifier: string,
    limit: number,
    current: number,
    resetTime: Date,
    details?: any,
    requestId?: string,
  ): void {
    this.logger.warn('Rate Limit Event', {
      type: 'rate_limit_event',
      identifier,
      limit,
      current,
      resetTime: resetTime.toISOString(),
      details,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logComplianceEvent(
    event: string,
    complianceType: string,
    userId: string,
    details: any,
    severity: 'INFO' | 'WARNING' | 'VIOLATION' = 'INFO',
    requestId?: string,
  ): void {
    const logLevel =
      severity === 'VIOLATION'
        ? 'error'
        : severity === 'WARNING'
          ? 'warn'
          : 'info';

    this.logger.log(logLevel, 'Compliance Event', {
      type: 'compliance_event',
      event,
      complianceType,
      userId,
      details,
      severity,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logIntegrationEvent(
    integration: string,
    event:
      | 'REQUEST_SENT'
      | 'RESPONSE_RECEIVED'
      | 'ERROR'
      | 'TIMEOUT'
      | 'RATE_LIMITED',
    details: any,
    duration?: number,
    requestId?: string,
  ): void {
    const logLevel =
      event === 'ERROR' || event === 'TIMEOUT' ? 'error' : 'info';

    this.logger.log(logLevel, 'Integration Event', {
      type: 'integration_event',
      integration,
      event,
      details,
      duration,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
