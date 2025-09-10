import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Use IP address and user ID (if authenticated) for tracking
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.['sub'] || 'anonymous';
    return `${ip}-${userId}`;
  }

  protected async getErrorMessage(): Promise<string> {
    return 'Too many requests. Please try again later.';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip rate limiting for health checks
    if (request.url === '/health' || request.url === '/') {
      return true;
    }

    // Skip rate limiting for internal service calls
    const userAgent = request.headers['user-agent'];
    if (userAgent && userAgent.includes('internal-service')) {
      return true;
    }

    return false;
  }
}
