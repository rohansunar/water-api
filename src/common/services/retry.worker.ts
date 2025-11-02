import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerBaseService } from './worker-base.service';

export interface RetryData {
  operation: 'notification' | 'upload' | 'payment' | 'sync';
  payload: any;
  maxRetries: number;
  retryCount: number;
  originalError: string;
  idempotencyKey?: string;
  priority?: 'low' | 'normal' | 'high';
}

@Injectable()
export class RetryWorker extends WorkerBaseService {
  private readonly maxRetryDelays = {
    low: [60000, 300000, 1800000], // 1min, 5min, 30min
    normal: [30000, 120000, 600000], // 30sec, 2min, 10min
    high: [10000, 60000, 300000], // 10sec, 1min, 5min
  };

  constructor() {
    super({
      queueName: 'retry-queue',
      concurrency: 3,
      attempts: 1, // Don't retry the retry worker itself
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
    });
  }

  protected async processJob(job: Job<RetryData>): Promise<any> {
    const {
      operation,
      payload,
      maxRetries,
      retryCount,
      originalError,
      idempotencyKey,
      priority,
    } = job.data;

    try {
      this.logger.log(
        `Processing retry ${retryCount}/${maxRetries} for ${operation}`,
      );

      // Check idempotency to prevent duplicate processing
      if (idempotencyKey && (await this.isAlreadyProcessed(idempotencyKey))) {
        this.logger.log(
          `Operation ${idempotencyKey} already processed, skipping`,
        );
        return { success: true, reason: 'already_processed' };
      }

      // Execute the retry operation
      const result = await this.executeOperation(operation, payload);

      // Mark as processed if successful
      if (result.success && idempotencyKey) {
        await this.markAsProcessed(idempotencyKey);
      }

      this.logger.log(`Retry ${retryCount} successful for ${operation}`);
      return {
        success: true,
        retryCount,
        result,
      };
    } catch (error) {
      this.logger.error(`Retry ${retryCount} failed for ${operation}:`, error);

      // Check if we should retry again
      if (retryCount < maxRetries) {
        const nextRetryDelay = this.calculateNextRetryDelay(
          priority || 'normal',
          retryCount,
        );

        // Re-queue for retry
        await this.addJob(
          `retry-${operation}-${Date.now()}`,
          {
            ...job.data,
            retryCount: retryCount + 1,
          },
          {
            delay: nextRetryDelay,
            priority: this.getRetryPriority(priority || 'normal', retryCount),
          },
        );

        return {
          success: false,
          retryCount,
          nextRetryIn: nextRetryDelay,
          willRetry: true,
        };
      } else {
        // Max retries reached, move to dead letter queue
        await this.handleMaxRetriesReached(job.data);
        return {
          success: false,
          retryCount,
          maxRetriesReached: true,
        };
      }
    }
  }

  private async executeOperation(
    operation: string,
    payload: any,
  ): Promise<any> {
    switch (operation) {
      case 'notification':
        return await this.retryNotification(payload);

      case 'upload':
        return await this.retryUpload(payload);

      case 'payment':
        return await this.retryPayment(payload);

      case 'sync':
        return await this.retrySync(payload);

      default:
        throw new Error(`Unknown operation type: ${operation}`);
    }
  }

  private async retryNotification(payload: any): Promise<any> {
    // Notification retry disabled since Redis is removed
    this.logger.warn('Notification retry disabled - Redis removed');
    return { success: false, method: 'disabled', reason: 'Redis removed' };
  }

  private async retryUpload(payload: any): Promise<any> {
    const { file, uploadType, metadata } = payload;

    // Simulate upload retry logic
    // In real implementation, this would retry the actual upload
    this.logger.debug(`Retrying upload for ${uploadType}:`, metadata);

    // Mock successful retry
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true, method: 'reuploaded' };
  }

  private async retryPayment(payload: any): Promise<any> {
    // Payment retry disabled since Redis is removed
    this.logger.warn('Payment retry disabled - Redis removed');
    return { success: false, method: 'disabled', reason: 'Redis removed' };
  }

  private async retrySync(payload: any): Promise<any> {
    // Sync retry disabled since Redis is removed
    this.logger.warn('Sync retry disabled - Redis removed');
    return { success: false, method: 'disabled', reason: 'Redis removed' };
  }

  private async isAlreadyProcessed(idempotencyKey: string): Promise<boolean> {
    // Idempotency check disabled since Redis is removed
    this.logger.debug(`Idempotency check disabled for ${idempotencyKey} - Redis removed`);
    return false; // Allow processing to continue
  }

  private async markAsProcessed(idempotencyKey: string): Promise<void> {
    // Mark as processed disabled since Redis is removed
    this.logger.debug(`Mark as processed disabled for ${idempotencyKey} - Redis removed`);
  }

  private calculateNextRetryDelay(
    priority: string,
    retryCount: number,
  ): number {
    const delays =
      this.maxRetryDelays[priority as keyof typeof this.maxRetryDelays] ||
      this.maxRetryDelays.normal;
    return delays[retryCount] || delays[delays.length - 1] || 300000; // Default to 5 minutes
  }

  private getRetryPriority(priority: string, retryCount: number): number {
    // Increase priority with each retry
    const basePriority = { low: 10, normal: 5, high: 1 }[priority] || 5;
    return Math.max(1, basePriority - retryCount);
  }

  private async handleMaxRetriesReached(retryData: RetryData): Promise<void> {
    // Dead letter queue disabled since Redis is removed
    this.logger.warn(`Max retries reached for ${retryData.operation} - dead letter queue disabled (Redis removed)`);
  }

  async getRetryMetrics(): Promise<any> {
    // Retry metrics disabled since Redis is removed
    return { isActive: false, reason: 'Redis removed' };
  }

  private async getProcessedCountToday(): Promise<number> {
    // This would typically query a database or cache
    // For now, return a mock value
    return 0;
  }
}
