import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class GracefulDegradationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GracefulDegradationMiddleware.name);
  private isDatabaseHealthy = true;
  private isCacheHealthy = true;
  private lastHealthCheck = Date.now();

  constructor(private readonly customLogger: CustomLoggerService) {}

  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    const method = req.method;
    const url = req.url;

    // Periodic health check
    this.performHealthCheck();

    // Add degradation flags to request for services to use
    req.degradationFlags = {
      databaseDown: !this.isDatabaseHealthy,
      cacheDown: !this.isCacheHealthy,
      reducedFunctionality: !this.isDatabaseHealthy || !this.isCacheHealthy,
    };

    // Log degradation status for important requests
    if (req.degradationFlags.reducedFunctionality) {
      this.customLogger.logBusinessEvent(
        'graceful_degradation_active',
        {
          databaseDown: !this.isDatabaseHealthy,
          cacheDown: !this.isCacheHealthy,
          method,
          url,
          requestId,
        },
        undefined,
      );

      this.logger.warn(
        `Operating in degraded mode - Database: ${this.isDatabaseHealthy ? 'UP' : 'DOWN'}, Cache: ${this.isCacheHealthy ? 'UP' : 'DOWN'} for ${method} ${url}`,
      );
    }

    next();
  }

  private async performHealthCheck() {
    const now = Date.now();
    // Check health every 30 seconds
    if (now - this.lastHealthCheck < 30000) {
      return;
    }

    this.lastHealthCheck = now;

    try {
      // Simple database health check
      await this.checkDatabaseHealth();
      if (!this.isDatabaseHealthy) {
        this.isDatabaseHealthy = true;
        this.customLogger.logBusinessEvent('database_restored', {
          timestamp: new Date().toISOString(),
        });
        this.logger.log('Database health restored');
      }
    } catch (error) {
      if (this.isDatabaseHealthy) {
        this.isDatabaseHealthy = false;
        this.customLogger.logBusinessEvent('database_down', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        this.logger.error('Database health check failed:', error.message);
      }
    }

    try {
      // Cache health check (if applicable)
      await this.checkCacheHealth();
      if (!this.isCacheHealthy) {
        this.isCacheHealthy = true;
        this.customLogger.logBusinessEvent('cache_restored', {
          timestamp: new Date().toISOString(),
        });
        this.logger.log('Cache health restored');
      }
    } catch (error) {
      if (this.isCacheHealthy) {
        this.isCacheHealthy = false;
        this.customLogger.logBusinessEvent('cache_down', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        this.logger.error('Cache health check failed:', error.message);
      }
    }
  }

  private async checkDatabaseHealth(): Promise<void> {
    // This would typically ping the database
    // For now, we'll assume it's healthy unless we have specific failure indicators
    // In a real implementation, you'd do something like:
    // await this.databaseService.ping();
  }

  private async checkCacheHealth(): Promise<void> {
    // Check cache health if applicable
    // For now, assume healthy
  }

  // Method to manually set health status (useful for testing or external monitoring)
  setDatabaseHealth(healthy: boolean) {
    this.isDatabaseHealthy = healthy;
  }

  setCacheHealth(healthy: boolean) {
    this.isCacheHealthy = healthy;
  }

  getHealthStatus() {
    return {
      database: this.isDatabaseHealthy,
      cache: this.isCacheHealthy,
      overall: this.isDatabaseHealthy && this.isCacheHealthy,
      lastCheck: this.lastHealthCheck,
    };
  }
}
