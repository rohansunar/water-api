import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CustomLoggerService } from '../logger/logger.service';
import { EventBusService } from '../events/event-bus.service';
import { IModuleService, ModuleHealthStatus } from '../interfaces/module-communication.interface';

/**
 * Base Module Service
 * Provides common functionality for all module services
 */
@Injectable()
export abstract class BaseModuleService implements IModuleService, OnModuleInit, OnModuleDestroy {
  protected readonly startTime = Date.now();
  protected requestCount = 0;
  protected errorCount = 0;
  protected readonly timers = new Set<NodeJS.Timeout>();
  protected readonly intervals = new Set<NodeJS.Timeout>();

  constructor(
    protected readonly logger: CustomLoggerService,
    protected readonly eventBus: EventBusService,
    public readonly moduleName: string
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.logModuleAction(this.moduleName, 'Module initialized');
    await this.initializeModule();
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up timers and intervals
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();

    this.logger.logModuleAction(this.moduleName, 'Module destroyed');
    await this.cleanupModule();
  }

  /**
   * Override this method to perform module-specific initialization
   */
  protected async initializeModule(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Override this method to perform module-specific cleanup
   */
  protected async cleanupModule(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

      const healthStatus: ModuleHealthStatus = {
        module: this.moduleName,
        status: errorRate > 10 ? 'degraded' : 'healthy',
        uptime,
        lastCheck: new Date(),
        dependencies: await this.checkDependencies(),
        metrics: {
          memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          cpuUsage: 0, // Would need additional monitoring for actual CPU usage
          requestCount: this.requestCount,
          errorRate,
        },
      };

      // Log memory usage periodically
      if (this.requestCount % 100 === 0) {
        this.logger.logMemoryUsage(this.moduleName, memoryUsage);
      }

      return {
        status: healthStatus.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: healthStatus,
      };
    } catch (error) {
      this.logger.error(`Health check failed for ${this.moduleName}`, error.stack, this.moduleName);
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  /**
   * Override this method to check module-specific dependencies
   */
  protected async checkDependencies(): Promise<{
    database: 'connected' | 'disconnected';
    externalServices: 'available' | 'unavailable';
  }> {
    return {
      database: 'connected', // Default - override in specific modules
      externalServices: 'available', // Default - override in specific modules
    };
  }

  /**
   * Execute operation with performance tracking and error handling
   */
  protected async executeWithTracking<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: { userId?: string; requestId?: string }
  ): Promise<T> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      this.logger.logModuleAction(this.moduleName, `Starting ${operation}`, undefined, context);
      
      const result = await fn();
      
      const duration = Date.now() - startTime;
      this.logger.logPerformance(`${this.moduleName}.${operation}`, duration, context);
      
      return result;
    } catch (error) {
      this.errorCount++;
      const duration = Date.now() - startTime;
      
      this.logger.logApiError(
        operation,
        'INTERNAL',
        500,
        error,
        context?.userId,
        context?.requestId
      );
      
      this.logger.logPerformance(`${this.moduleName}.${operation}`, duration, {
        ...context,
        error: true,
      });
      
      throw error;
    }
  }

  /**
   * Publish event with error handling
   */
  protected async publishEvent(eventType: string, eventData: any, correlationId?: string): Promise<void> {
    try {
      await this.eventBus.publish({
        eventId: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        timestamp: new Date(),
        source: this.moduleName,
        data: eventData,
        correlationId,
      });

      this.logger.logEvent(eventType, eventData, {
        source: this.moduleName,
        correlationId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${eventType}`,
        error.stack,
        this.moduleName
      );
      // Don't rethrow - event publishing should not break business logic
    }
  }

  /**
   * Create a managed timeout that will be cleaned up on module destroy
   */
  protected createTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      this.timers.delete(timeout);
      callback();
    }, delay);
    
    this.timers.add(timeout);
    return timeout;
  }

  /**
   * Create a managed interval that will be cleaned up on module destroy
   */
  protected createInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Get module statistics
   */
  getModuleStats(): {
    moduleName: string;
    uptime: number;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      moduleName: this.moduleName,
      uptime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      memoryUsage: process.memoryUsage(),
    };
  }
}
