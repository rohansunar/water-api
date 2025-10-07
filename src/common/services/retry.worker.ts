import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerBaseService } from './worker-base.service';
import { RedisService } from './redis.service';

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

  constructor(protected readonly redisService: RedisService) {
    super(redisService, {
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
    const { type, recipientId, title, message, channels } = payload;

    // Add to notification queue for reprocessing
    await this.redisService.getClient()?.lPush(
      'notifications:queue',
      JSON.stringify({
        type,
        recipientId,
        recipientType: payload.recipientType,
        title,
        message,
        metadata: payload.metadata,
        priority: payload.priority || 'normal',
        channels: channels || ['push'],
      }),
    );

    return { success: true, method: 'requeued' };
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
    const { orderId, amount, paymentMethod } = payload;

    // Add to payment processing queue
    await this.redisService.getClient()?.lPush(
      'payments:retry',
      JSON.stringify({
        orderId,
        amount,
        paymentMethod,
        timestamp: new Date().toISOString(),
      }),
    );

    return { success: true, method: 'requeued' };
  }

  private async retrySync(payload: any): Promise<any> {
    const { entityType, entityId, data } = payload;

    // Add to sync queue
    await this.redisService.getClient()?.lPush(
      'sync:queue',
      JSON.stringify({
        entityType,
        entityId,
        data,
        timestamp: new Date().toISOString(),
      }),
    );

    return { success: true, method: 'requeued' };
  }

  private async isAlreadyProcessed(idempotencyKey: string): Promise<boolean> {
    const result = await this.redisService.get(`processed:${idempotencyKey}`);
    return result !== null;
  }

  private async markAsProcessed(idempotencyKey: string): Promise<void> {
    await this.redisService.set(
      `processed:${idempotencyKey}`,
      'true',
      'EX',
      86400,
    ); // 24 hours
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
    // Log to dead letter queue for manual review
    const deadLetterData = {
      ...retryData,
      finalError: 'Max retries reached',
      timestamp: new Date().toISOString(),
    };

    await this.redisService
      .getClient()
      ?.lPush('dead-letter-queue', JSON.stringify(deadLetterData));

    // Send alert notification
    await this.redisService.getClient()?.lPush(
      'notifications:queue',
      JSON.stringify({
        type: 'system_alert',
        recipientId: 'admin',
        recipientType: 'admin',
        title: 'Max Retries Reached',
        message: `Operation ${retryData.operation} failed after ${retryData.maxRetries} retries`,
        metadata: {
          operation: retryData.operation,
          maxRetries: retryData.maxRetries,
          originalError: retryData.originalError,
        },
        priority: 'high',
        channels: ['push', 'email'],
      }),
    );
  }

  async getRetryMetrics(): Promise<any> {
    const client = this.redisService.getClient();
    if (!client) return { isActive: false };

    try {
      const [retryQueueLength, deadLetterLength] = await Promise.all([
        client.lLen('retry-queue'),
        client.lLen('dead-letter-queue'),
      ]);

      return {
        isActive: true,
        retryQueueLength,
        deadLetterLength,
        processedToday: await this.getProcessedCountToday(),
      };
    } catch (error) {
      this.logger.error('Failed to get retry metrics:', error);
      return { isActive: false };
    }
  }

  private async getProcessedCountToday(): Promise<number> {
    // This would typically query a database or cache
    // For now, return a mock value
    return 0;
  }
}
