import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, mergeMap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RetryInterceptor.name);

  constructor(private readonly customLogger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const requestId = request.headers['x-request-id'] || 'unknown';

    return next.handle().pipe(
      retry({
        count: 3,
        delay: (error, retryIndex) => {
          // Only retry on specific transient errors
          if (this.isTransientError(error)) {
            const delay = Math.min(1000 * Math.pow(2, retryIndex), 10000); // Exponential backoff, max 10s

            this.customLogger.logDatabaseOperation(
              'retry_attempt',
              'database',
              delay,
              false,
              {
                error: error.message,
                retryIndex,
                method,
                url,
                requestId,
              },
            );

            this.logger.warn(
              `Retrying request ${method} ${url} (attempt ${retryIndex + 1}/3) after ${delay}ms`,
            );

            return timer(delay);
          }

          // Don't retry for non-transient errors
          return throwError(() => error);
        },
      }),
      catchError((error) => {
        // Log final failure after all retries
        if (this.isTransientError(error)) {
          this.customLogger.logDatabaseOperation(
            'retry_exhausted',
            'database',
            0,
            false,
            {
              error: error.message,
              method,
              url,
              requestId,
            },
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private isTransientError(error: any): boolean {
    // Check for MongoDB connection errors, network timeouts, etc.
    if (!error) return false;

    const errorMessage = error.message || '';
    const errorCode = error.code || error.codeName;

    // MongoDB transient errors
    const transientCodes = [
      6, // HostUnreachable
      7, // HostNotFound
      89, // NetworkTimeout
      91, // ShutdownInProgress
      100, // ClientMarkedAsClosed
      10107, // NotMaster
      11600, // InterruptedAtShutdown
      11602, // InterruptedDueToReplStateChange
      13435, // NotMasterNoSlaveOk
      13436, // NotMasterOrSecondary
    ];

    // Check error codes
    if (transientCodes.includes(errorCode)) {
      return true;
    }

    // Check error messages for transient patterns
    const transientPatterns = [
      /connection.*timeout/i,
      /network.*error/i,
      /connection.*refused/i,
      /connection.*reset/i,
      /socket.*hang.*up/i,
      /econnrefused/i,
      /enotfound/i,
      /econnreset/i,
      /etimedout/i,
      /temporary.*failure/i,
      /service.*unavailable/i,
    ];

    return transientPatterns.some((pattern) => pattern.test(errorMessage));
  }
}
