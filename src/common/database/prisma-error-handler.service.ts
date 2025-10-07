import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CustomLoggerService } from '../logger/logger.service';
import {
  DatabaseException,
  DatabaseConnectionException,
  DuplicateRecordException,
  RecordNotFoundException,
  BusinessException,
  ErrorCategory,
  ErrorSeverity,
} from '../exceptions/business.exception';

export enum DatabaseOperation {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPSERT = 'UPSERT',
  AGGREGATE = 'AGGREGATE',
  TRANSACTION = 'TRANSACTION',
}

export interface DatabaseErrorContext {
  operation: DatabaseOperation;
  model: string;
  recordId?: string | number;
  where?: Record<string, any>;
  data?: Record<string, any>;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

@Injectable()
export class PrismaErrorHandlerService {
  private readonly logger = new Logger(PrismaErrorHandlerService.name);
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: [
      'P1001', // Can't reach database server
      'P1002', // The database server was reached but it was not possible to establish a connection
      'P1003', // Database does not exist
      'P1008', // Operations timed out
      'P1010', // User was denied access to the database
      'P1017', // Server has closed the connection
    ],
  };

  constructor(private readonly customLogger: CustomLoggerService) {}

  /**
   * Handle Prisma errors and convert them to appropriate business exceptions
   */
  handleError(
    error: any,
    context: DatabaseErrorContext,
    retryConfig?: Partial<RetryConfig>,
  ): never {
    const config = { ...this.defaultRetryConfig, ...retryConfig };

    // Log the error with full context
    this.logDatabaseError(error, context, config);

    // Check if error is retryable
    const isRetryable = this.isRetryableError(error, config);

    // Convert to appropriate business exception
    const businessException = this.convertToBusinessException(
      error,
      context,
      isRetryable,
    );

    // Log the business exception
    this.customLogger.logDatabaseOperation(
      context.operation,
      context.model,
      0,
      false,
      {
        error: businessException.message,
        errorCode: businessException.errorCode,
        retryable: businessException.retryable,
        originalError: error.message,
      },
    );

    throw businessException;
  }

  /**
   * Execute database operation with error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: DatabaseErrorContext,
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Log successful operation
        this.customLogger.logDatabaseOperation(
          context.operation,
          context.model,
          duration,
          true,
          {
            attempt,
            recordId: context.recordId,
            userId: context.userId,
          },
        );

        return result;
      } catch (error) {
        lastError = error;
        const isRetryable = this.isRetryableError(error, config);

        if (!isRetryable || attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay,
        );

        this.logger.warn(
          `Database operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms: ${error.message}`,
        );

        await this.delay(delay);
      }
    }

    // All retries exhausted, handle the final error
    this.handleError(lastError, context, config);
  }

  /**
   * Check if error is retryable based on configuration
   */
  private isRetryableError(error: any, config: RetryConfig): boolean {
    if (!error) return false;

    // Handle Prisma known request errors
    if (error instanceof PrismaClientKnownRequestError) {
      return config.retryableErrors.includes(error.code);
    }

    // Handle other Prisma errors
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    // Check error code against retryable errors
    for (const retryableError of config.retryableErrors) {
      if (
        errorCode === retryableError ||
        errorMessage.includes(retryableError)
      ) {
        return true;
      }
    }

    // Check for connection-related error patterns
    const connectionErrorPatterns = [
      /connection.*error/i,
      /connection.*failed/i,
      /connection.*lost/i,
      /network.*error/i,
      /timeout/i,
      /unreachable/i,
    ];

    return connectionErrorPatterns.some((pattern) =>
      pattern.test(errorMessage),
    );
  }

  /**
   * Convert Prisma error to appropriate business exception
   */
  private convertToBusinessException(
    error: any,
    context: DatabaseErrorContext,
    retryable: boolean,
  ): BusinessException {
    // Handle Prisma known request errors
    if (error instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(error, context, retryable);
    }

    // Handle other Prisma errors
    if (error.name === 'PrismaClientInitializationError') {
      return new DatabaseConnectionException(
        `Database initialization failed: ${error.message}`,
      );
    }

    if (error.name === 'PrismaClientRustPanicError') {
      return new DatabaseException(
        `Database panic error: ${error.message}`,
        context.operation,
        false,
      );
    }

    if (error.name === 'PrismaClientValidationError') {
      return new DatabaseException(
        `Database validation error: ${error.message}`,
        context.operation,
        false,
      );
    }

    // Generic database error
    return new DatabaseException(
      `Database operation failed: ${error.message}`,
      context.operation,
      retryable,
    );
  }

  /**
   * Handle Prisma known request errors
   */
  private handlePrismaKnownError(
    error: PrismaClientKnownRequestError,
    context: DatabaseErrorContext,
    retryable: boolean,
  ): BusinessException {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        const field = this.extractConstraintField(error);
        return new DuplicateRecordException(context.model, field);

      case 'P2025': // Record not found
        return new RecordNotFoundException(
          context.model,
          context.recordId?.toString(),
        );

      case 'P2003': // Foreign key constraint failed
        return new DatabaseException(
          `Foreign key constraint failed: ${error.message}`,
          context.operation,
          false,
        );

      case 'P2021': // Table does not exist
        return new DatabaseException(
          `Table ${context.model} does not exist: ${error.message}`,
          context.operation,
          false,
        );

      case 'P2022': // Column does not exist
        return new DatabaseException(
          `Column does not exist: ${error.message}`,
          context.operation,
          false,
        );

      case 'P1001': // Can't reach database server
        return new DatabaseConnectionException(
          `Cannot reach database server: ${error.message}`,
        );

      case 'P1002': // Database server connection error
        return new DatabaseConnectionException(
          `Database connection error: ${error.message}`,
        );

      case 'P1003': // Database does not exist
        return new DatabaseConnectionException(
          `Database does not exist: ${error.message}`,
        );

      case 'P1008': // Database timeout
        return new DatabaseException(
          `Database operation timed out: ${error.message}`,
          context.operation,
          true,
        );

      case 'P1010': // User denied access
        return new DatabaseException(
          `Database access denied: ${error.message}`,
          context.operation,
          false,
        );

      case 'P1017': // Server closed connection
        return new DatabaseConnectionException(
          `Database server closed connection: ${error.message}`,
        );

      default:
        return new DatabaseException(
          `Prisma error: ${error.message}`,
          context.operation,
          retryable,
        );
    }
  }

  /**
   * Extract field name from Prisma unique constraint error
   */
  private extractConstraintField(error: PrismaClientKnownRequestError): string {
    try {
      const meta = error.meta as any;
      if (meta?.target) {
        return Array.isArray(meta.target) ? meta.target[0] : meta.target;
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Log database error with full context
   */
  private logDatabaseError(
    error: any,
    context: DatabaseErrorContext,
    config: RetryConfig,
  ): void {
    const logData = {
      operation: context.operation,
      model: context.model,
      recordId: context.recordId,
      where: context.where ? JSON.stringify(context.where) : undefined,
      data: context.data ? JSON.stringify(context.data) : undefined,
      userId: context.userId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
      retryConfig: {
        maxAttempts: config.maxAttempts,
        retryable: this.isRetryableError(error, config),
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Database error occurred', logData);

    // Also log to custom logger for structured logging
    this.customLogger.logDatabaseOperation(
      context.operation,
      context.model,
      0,
      false,
      {
        error: error.message,
        errorCode: error.code,
        errorName: error.name,
        recordId: context.recordId,
        userId: context.userId,
        requestId: context.requestId,
      },
    );
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get database operation performance metrics
   */
  async getOperationMetrics(): Promise<any> {
    // This would integrate with Prisma metrics or custom metrics collection
    // For now, return basic metrics structure
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      slowestOperations: [],
      errorRate: 0,
      retryRate: 0,
    };
  }
}
