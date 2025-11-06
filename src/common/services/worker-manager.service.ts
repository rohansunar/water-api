import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { NotificationWorker } from './notification.worker';
import { ReconciliationWorker } from './reconciliation.worker';

@Injectable()
export class WorkerManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerManagerService.name);
  private workers: any[] = [];
  private isShuttingDown = false;

  constructor(
    private readonly notificationWorker: NotificationWorker,
    private readonly reconciliationWorker: ReconciliationWorker,
  ) {}

  async onModuleInit() {
    await this.initializeWorkers();
    await this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.gracefulShutdown();
  }

  private async initializeWorkers(): Promise<void> {
    try {
      this.workers = [this.notificationWorker, this.reconciliationWorker];

      this.logger.log('All workers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize workers:', error);
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    // Monitor worker health every 30 seconds
    const healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(healthCheckInterval);
        return;
      }

      await this.performHealthCheck();
    }, 30000);

    // Monitor queue lengths every 60 seconds
    const queueMonitorInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(queueMonitorInterval);
        return;
      }

      await this.monitorQueueLengths();
    }, 60000);
  }

  private async performHealthCheck(): Promise<void> {
    for (const worker of this.workers) {
      try {
        this.logger.debug(
          `Checking health for worker: ${worker.constructor.name}`,
        );
        const metrics = await worker.getQueueMetrics();
        this.logger.debug(
          `Metrics received for ${worker.constructor.name}:`,
          metrics,
        );

        // Handle case where metrics is undefined or null
        if (!metrics) {
          this.logger.warn(
            `${worker.constructor.name} health: DEGRADED - no metrics returned`,
          );
          continue;
        }

        if (typeof metrics.isActive === 'boolean') {
          if (metrics.isActive) {
            this.logger.debug(
              `${worker.constructor.name} health: OK, Queue: ${JSON.stringify(metrics)}`,
            );
          } else {
            this.logger.warn(`${worker.constructor.name} health: DEGRADED`);
          }
        } else {
          this.logger.warn(
            `${worker.constructor.name} health: DEGRADED - invalid metrics`,
          );
        }
      } catch (error) {
        this.logger.error(
          `${worker.constructor.name} health check failed:`,
          error,
        );
      }
    }
  }

  private async monitorQueueLengths(): Promise<void> {
    try {
      this.logger.debug('Starting queue length monitoring');
      const queueMetrics = await Promise.all(
        this.workers.map(async (worker) => {
          this.logger.debug(
            `Getting metrics for worker: ${worker.constructor.name}`,
          );
          const metrics = await worker.getQueueMetrics();
          this.logger.debug(`Metrics for ${worker.constructor.name}:`, metrics);
          return {
            name: worker.constructor.name,
            metrics,
          };
        }),
      );

      // Log warnings for high queue lengths
      for (const { name, metrics } of queueMetrics) {
        this.logger.debug(`Processing metrics for ${name}:`, metrics);

        // Handle case where metrics is undefined or null
        if (!metrics) {
          this.logger.warn(`${name}: DEGRADED - no metrics returned`);
          continue;
        }

        if (typeof metrics.isActive === 'boolean' && metrics.isActive) {
          const totalJobs = (metrics.waiting || 0) + (metrics.active || 0);

          if (totalJobs > 100) {
            this.logger.warn(
              `${name}: High queue load - ${totalJobs} total jobs`,
            );
          } else if (totalJobs > 50) {
            this.logger.log(
              `${name}: Moderate queue load - ${totalJobs} total jobs`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Queue monitoring failed:', error);
    }
  }

  async getAllWorkerMetrics(): Promise<any> {
    try {
      const allMetrics = await Promise.all(
        this.workers.map(async (worker) => ({
          name: worker.constructor.name,
          metrics: (await worker.getQueueMetrics()) || {
            isActive: false,
            reason: 'No metrics',
          },
        })),
      );

      const summary = {
        totalWorkers: this.workers.length,
        activeWorkers: allMetrics.filter((m) => m.metrics && m.metrics.isActive)
          .length,
        workers: allMetrics,
        timestamp: new Date().toISOString(),
      };

      return summary;
    } catch (error) {
      this.logger.error('Failed to get worker metrics:', error);
      return { error: 'Failed to retrieve metrics' };
    }
  }

  async pauseWorker(workerName: string): Promise<boolean> {
    try {
      const worker = this.workers.find(
        (w) => w.constructor.name === workerName,
      );
      if (!worker) {
        this.logger.warn(`Worker ${workerName} not found`);
        return false;
      }

      // Implementation depends on BullMQ worker pause functionality
      this.logger.log(`Pausing worker ${workerName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to pause worker ${workerName}:`, error);
      return false;
    }
  }

  async resumeWorker(workerName: string): Promise<boolean> {
    try {
      const worker = this.workers.find(
        (w) => w.constructor.name === workerName,
      );
      if (!worker) {
        this.logger.warn(`Worker ${workerName} not found`);
        return false;
      }

      // Implementation depends on BullMQ worker resume functionality
      this.logger.log(`Resuming worker ${workerName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to resume worker ${workerName}:`, error);
      return false;
    }
  }

  async addNotificationJob(data: any): Promise<string> {
    try {
      return await this.notificationWorker.addJob('notification', data);
    } catch (error) {
      this.logger.error('Failed to add notification job:', error);
      throw error;
    }
  }

  async addReconciliationJob(data: any): Promise<string> {
    try {
      return await this.reconciliationWorker.addJob('reconciliation', data);
    } catch (error) {
      this.logger.error('Failed to add reconciliation job:', error);
      throw error;
    }
  }

  async addFraudDetectionJob(data: any): Promise<string> {
    throw new Error('Fraud detection worker not available');
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.log('Starting graceful shutdown of workers...');

    try {
      // Wait for active jobs to complete (with timeout)
      const shutdownPromises = this.workers.map(async (worker) => {
        try {
          const metrics = (await worker.getQueueMetrics()) || {
            active: 0,
            reason: 'No metrics',
          };
          if (metrics.active > 0) {
            this.logger.log(
              `Waiting for ${metrics.active} active jobs in ${worker.constructor.name} to complete...`,
            );
            // Wait up to 30 seconds for active jobs
            await this.waitForActiveJobs(worker, 30000);
          }
        } catch (error) {
          this.logger.error(
            `Error during shutdown of ${worker.constructor.name}:`,
            error,
          );
        }
      });

      await Promise.allSettled(shutdownPromises);
      this.logger.log('All workers shut down gracefully');
    } catch (error) {
      this.logger.error('Error during worker shutdown:', error);
    }
  }

  private async waitForActiveJobs(worker: any, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const metrics = (await worker.getQueueMetrics()) || {
          active: 0,
          reason: 'No metrics',
        };
        if (metrics.active === 0) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        return; // Stop waiting if we can't check metrics
      }
    }

    this.logger.warn(
      `Timeout waiting for active jobs in ${worker.constructor.name} to complete`,
    );
  }
}
