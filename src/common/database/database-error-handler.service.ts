import { Injectable, Logger } from '@nestjs/common';
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
  AGGREGATE = 'AGGREGATE',
  BULK_WRITE = 'BULK_WRITE',
  TRANSACTION = 'TRANSACTION',
}

export interface DatabaseErrorContext {
  operation: DatabaseOperation;
  collection: string;
  documentId?: string;
  filter?: Record<string, any>;
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
export class DatabaseErrorHandlerService {
  private readonly logger = new Logger(DatabaseErrorHandlerService.name);
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE'],
  };

  constructor(private readonly customLogger: CustomLoggerService) {}

  /**
   * Handle database errors and convert them to appropriate business exceptions
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
      context.collection,
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
          context.collection,
          duration,
          true,
          {
            attempt,
            documentId: context.documentId,
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

    const errorName = error.name || '';
    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    // Check error name/code against retryable errors
    for (const retryableError of config.retryableErrors) {
      if (
        errorName.includes(retryableError) ||
        errorCode === retryableError ||
        errorMessage.includes(retryableError)
      ) {
        return true;
      }
    }

    // Check for network-related error patterns
    const networkErrorPatterns = [
      /network.*error/i,
      /connection.*timeout/i,
      /connection.*refused/i,
      /connection.*reset/i,
      /socket.*hang.*up/i,
      /econnrefused/i,
      /enotfound/i,
      /econnreset/i,
      /etimedout/i,
    ];

    return networkErrorPatterns.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Convert database error to appropriate business exception
   */
  private convertToBusinessException(
    error: any,
    context: DatabaseErrorContext,
    retryable: boolean,
  ): BusinessException {
    // Handle duplicate key errors (Prisma P2002)
    if (error.code === 'P2002') {
      const field = this.extractDuplicateField(error);
      return new DuplicateRecordException(context.collection, field);
    }

    // Handle connection errors
    if (this.isConnectionError(error)) {
      return new DatabaseConnectionException(
        `Database connection failed: ${error.message}`,
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
   * Extract field name from duplicate key error
   */
  private extractDuplicateField(error: any): string {
    try {
      if (error.meta && error.meta.target && error.meta.target.length > 0) {
        return error.meta.target[0];
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if error is a connection-related error
   */
  private isConnectionError(error: any): boolean {
    const connectionErrorPatterns = [
      /connection.*error/i,
      /connection.*failed/i,
      /connection.*lost/i,
      /connection.*refused/i,
      /connection.*reset/i,
      /network.*error/i,
      /socket.*error/i,
      /econnrefused/i,
      /enotfound/i,
      /econnreset/i,
    ];

    const errorMessage = error.message || '';
    return connectionErrorPatterns.some((pattern) =>
      pattern.test(errorMessage),
    );
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
      collection: context.collection,
      documentId: context.documentId,
      filter: context.filter ? JSON.stringify(context.filter) : undefined,
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
      context.collection,
      0,
      false,
      {
        error: error.message,
        errorCode: error.code,
        errorName: error.name,
        documentId: context.documentId,
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
    // This would integrate with MongoDB profiler or custom metrics collection
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
