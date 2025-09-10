import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const { method, url, headers } = request;
    const userAgent = headers['user-agent'] || '';

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const { statusCode } = response;

        // Log HTTP request
        this.logger.logHttpRequest(
          method,
          url,
          statusCode,
          responseTime,
          userAgent,
        );

        // Log slow requests as warnings
        if (responseTime > 1000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} took ${responseTime}ms`,
            'LoggingInterceptor',
          );
        }
      }),
    );
  }
}
