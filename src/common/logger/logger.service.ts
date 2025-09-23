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
}
