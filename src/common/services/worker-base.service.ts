import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { RedisService } from './redis.service';

/**
 * Configuration interface for worker setup
 * Defines queue behavior, retry policies, and concurrency settings
 */
export interface WorkerConfig {
  /** Name of the Redis queue this worker will process */
  queueName: string;
  /** Maximum number of concurrent jobs to process (default: 5) */
  concurrency?: number;
  /** Maximum number of retry attempts per job (default: 3) */
  attempts?: number;
  /** Backoff strategy for failed jobs */
  backoff?: {
    /** Type of backoff: 'exponential' or 'fixed' delay */
    type: 'exponential' | 'fixed';
    /** Base delay in milliseconds between retries */
    delay: number;
  };
}

/**
 * Internal circuit breaker state tracking
 * Implements the circuit breaker pattern to prevent cascade failures
 */
interface CircuitBreakerState {
  /** Number of consecutive failures */
  failures: number;
  /** Timestamp of the last failure in milliseconds */
  lastFailureTime: number;
  /** Current state: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery) */
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * Abstract base service for implementing resilient worker processes with circuit breaker pattern,
 * health monitoring, and comprehensive error handling.
 *
 * This service provides a robust foundation for building queue-based workers that can:
 * - Handle failures gracefully with automatic retry and backoff strategies
 * - Monitor system health and prevent cascade failures using circuit breaker pattern
 * - Collect metrics and provide observability into worker performance
 * - Manage worker lifecycle from initialization to cleanup
 * - Process jobs with built-in error handling and logging
 *
 * Architecture:
 * - Uses BullMQ for Redis-based queue management and job processing
 * - Implements circuit breaker pattern to prevent system overload during failures
 * - Provides health monitoring with configurable thresholds and recovery mechanisms
 * - Supports event-driven architecture with comprehensive event handling
 * - Includes metrics collection for monitoring and alerting
 *
 * Key Features:
 * - Automatic worker initialization and cleanup on module lifecycle
 * - Circuit breaker with CLOSED/OPEN/HALF_OPEN states for fault tolerance
 * - Health checks every 30 seconds to detect degraded performance
 * - Metrics collection every minute for monitoring and observability
 * - Configurable retry policies with exponential/fixed backoff
 * - Comprehensive logging for debugging and monitoring
 * - Event-driven architecture with job lifecycle event handling
 *
 * Usage:
 * Extend this class and implement the abstract processJob method to define
 * the actual job processing logic specific to your use case.
 */
@Injectable()
export abstract class WorkerBaseService
  implements OnModuleInit, OnModuleDestroy
{
  /** Logger instance for structured logging with class name context */
  protected readonly logger = new Logger(this.constructor.name);

  /** BullMQ queue instance for job management */
  protected queue: Queue;

  /** BullMQ worker instance for processing jobs */
  protected worker: Worker;

  /** BullMQ queue events listener for monitoring job lifecycle */
  protected queueEvents: QueueEvents;

  /** Flag indicating if the worker is currently active and processing jobs */
  protected isWorkerActive = false;

  /** Circuit breaker state tracking for fault tolerance */
  protected circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
  };

  /** Maximum consecutive failures before opening circuit breaker */
  private readonly failureThreshold = 5;

  /** Time in milliseconds to wait before attempting recovery from OPEN state */
  private readonly recoveryTimeout = 60000; // 1 minute

  /** Maximum requests allowed in HALF_OPEN state before transitioning back to CLOSED */
  private readonly halfOpenMaxRequests = 3;

  /** Counter for requests processed in HALF_OPEN state */
  private halfOpenRequests = 0;

  /** Interval timer for periodic health checks */
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /** Interval timer for periodic metrics collection */
  private metricsInterval: NodeJS.Timeout | null = null;

  /**
   * Constructor for WorkerBaseService
   * @param redisService - Redis service for queue connectivity
   * @param config - Worker configuration defining queue behavior
   */
  constructor(
    protected readonly redisService: RedisService,
    protected readonly config: WorkerConfig,
  ) {}

  /**
   * Lifecycle hook called when the module is initialized
   * Sets up the worker infrastructure and starts monitoring
   */
  async onModuleInit() {
    await this.initializeWorker();
    this.startHealthCheck();
    this.startMetricsCollection();
  }

  /**
   * Lifecycle hook called when the module is destroyed
   * Ensures proper cleanup of resources and monitoring
   */
  async onModuleDestroy() {
    this.stopHealthCheck();
    this.stopMetricsCollection();
    await this.cleanup();
  }

  /**
   * Abstract method to be implemented by concrete worker classes
   * Contains the actual business logic for processing jobs
   * @param job - The BullMQ job to process
   * @returns Promise resolving to the job result
   */
  protected abstract processJob(job: Job): Promise<any>;

  /**
   * Initializes the worker infrastructure including queue, worker, and event listeners
   * This method sets up the complete worker environment with proper error handling
   * and circuit breaker integration
   * @private
   */
  private async initializeWorker(): Promise<void> {
    try {
      // Get Redis client for queue connectivity
      const redisClient = this.redisService.getClient();
      if (!redisClient) {
        this.logger.warn('Redis not available, worker will not start');
        return;
      }

      // Initialize queue with default job options and retry configuration
      // Configures automatic job cleanup to prevent Redis memory bloat
      this.queue = new Queue(this.config.queueName, {
        connection: redisClient as any,
        defaultJobOptions: {
          // Retry configuration from worker config or defaults
          attempts: this.config.attempts || 3,
          backoff: this.config.backoff || {
            type: 'exponential',
            delay: 5000,
          },
          // Keep last 50 completed jobs for monitoring, remove older ones
          removeOnComplete: 50,
          // Keep last 20 failed jobs for debugging, remove older ones
          removeOnFail: 20,
        },
      });

      // Initialize worker with job processing logic
      // The worker function implements the circuit breaker pattern and comprehensive error handling
      this.worker = new Worker(
        this.config.queueName,
        async (job: Job) => {
          // Circuit breaker check: prevents processing when system is failing
          // This implements the core fault tolerance mechanism
          if (!this.canExecute()) {
            this.logger.warn(
              `Circuit breaker is OPEN, rejecting job ${job.id}`,
            );
            throw new Error(
              'Circuit breaker is open, service temporarily unavailable',
            );
          }

          // Log job start and track processing time for performance monitoring
          this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
          const startTime = Date.now();

          try {
            // Execute the actual job processing logic (implemented by subclasses)
            const result = await this.processJob(job);
            const duration = Date.now() - startTime;

            // Performance monitoring: log slow jobs for optimization
            if (duration > 30000) {
              // 30 seconds threshold
              this.logger.warn(
                `Slow job processing for ${job.id}: ${duration}ms`,
              );
            }

            // Record successful execution for circuit breaker state management
            this.recordSuccess();
            this.logger.debug(
              `Job ${job.id} completed successfully in ${duration}ms`,
            );
            return result;
          } catch (error) {
            // Comprehensive error handling with duration tracking
            const duration = Date.now() - startTime;
            this.logger.error(
              `Job ${job.id} failed after ${duration}ms:`,
              error,
            );

            // Record failure for circuit breaker state management
            // This may trigger circuit breaker to OPEN state if threshold exceeded
            this.recordFailure();
            throw error;
          }
        },
        {
          connection: redisClient as any,
          // Concurrency control: limits simultaneous job processing
          concurrency: this.config.concurrency || 5,
        },
      );

      // Initialize queue events for monitoring job lifecycle events
      this.queueEvents = new QueueEvents(this.config.queueName, {
        connection: redisClient as any,
      });

      // Set up event handlers for job lifecycle monitoring
      this.setupEventHandlers();
      this.isWorkerActive = true;
      this.logger.log(
        `Worker ${this.config.queueName} initialized successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize worker ${this.config.queueName}:`,
        error,
      );
    }
  }

  /**
   * Sets up event handlers for monitoring job lifecycle events
   * Provides observability into worker operations and debugging capabilities
   * @private
   */
  private setupEventHandlers(): void {
    // Event handler for successful job completion
    this.worker.on('completed', (job: Job) => {
      this.logger.debug(`Job ${job.id} completed successfully`);
    });

    // Event handler for failed job processing
    this.worker.on('failed', (job: Job, err: Error) => {
      this.logger.error(`Job ${job.id} failed:`, err.message);
    });

    // Event handler for worker-level errors (not job-specific)
    this.worker.on('error', (err: Error) => {
      this.logger.error(`Worker ${this.config.queueName} error:`, err);
    });

    // Event handler for jobs entering the waiting queue
    this.queueEvents.on('waiting', ({ jobId }) => {
      this.logger.debug(`Job ${jobId} is waiting`);
    });
  }

  /**
   * Adds a new job to the queue for processing
   * @param name - Job type/name identifier
   * @param data - Job payload data
   * @param options - Optional job configuration (priority, delay, etc.)
   * @returns Promise resolving to the job ID string
   * @throws Error if job cannot be added to queue
   */
  async addJob(name: string, data: any, options?: any): Promise<string> {
    // Validate worker is active before adding jobs
    if (!this.isWorkerActive) {
      this.logger.warn(
        `Worker ${this.config.queueName} not active, job not added`,
      );
      return '';
    }

    try {
      // Add job to queue with provided options
      const job = await this.queue.add(name, data, options);
      this.logger.debug(
        `Added job ${job.id} to queue ${this.config.queueName}`,
      );
      return job.id || '';
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${this.config.queueName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves comprehensive queue metrics for monitoring and observability
   * Provides real-time statistics about job states and worker health
   * @returns Promise resolving to queue metrics object
   */
  async getQueueMetrics(): Promise<any> {
    // Return inactive status if worker is not running
    if (!this.isWorkerActive) {
      return { isActive: false };
    }

    try {
      // Fetch all job states concurrently for performance
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
      ]);

      // Return comprehensive metrics for monitoring dashboards
      return {
        isActive: true,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue metrics:', error);
      return { isActive: false };
    }
  }

  /**
   * Performs comprehensive cleanup of worker resources
   * Ensures proper shutdown of all components and prevents resource leaks
   * @private
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop monitoring intervals first
      this.stopHealthCheck();
      this.stopMetricsCollection();

      // Remove event listeners to prevent memory leaks
      this.removeEventListeners();

      // Close event listeners before worker and queue
      if (this.queueEvents) {
        await this.queueEvents.close();
      }

      // Close worker to stop accepting new jobs
      if (this.worker) {
        await this.worker.close();
      }

      // Close queue to release Redis connections
      if (this.queue) {
        await this.queue.close();
      }

      // Mark worker as inactive
      this.isWorkerActive = false;
      this.logger.log(
        `Worker ${this.config.queueName} cleaned up successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Error during cleanup of worker ${this.config.queueName}:`,
        error,
      );
    }
  }

  /**
   * Circuit Breaker Pattern Implementation
   * =====================================
   *
   * The circuit breaker pattern prevents cascade failures by temporarily stopping
   * requests to a failing service. It has three states:
   *
   * 1. CLOSED (Normal): All requests pass through normally
   * 2. OPEN (Failing): All requests are blocked to prevent system overload
   * 3. HALF_OPEN (Testing): Limited requests allowed to test service recovery
   *
   * State Transitions:
   * CLOSED -> OPEN: When failure count exceeds threshold (5 failures)
   * OPEN -> HALF_OPEN: After recovery timeout period (60 seconds)
   * HALF_OPEN -> CLOSED: After successful test requests (3 successful requests)
   * HALF_OPEN -> OPEN: If any request fails during testing
   */

  /**
   * Determines if a job can be executed based on circuit breaker state
   * This is the core decision point for fault tolerance
   * @private
   * @returns boolean indicating if execution is allowed
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        // Normal operation: allow all requests
        return true;

      case 'OPEN':
        // Check if recovery timeout has elapsed
        if (now - this.circuitBreaker.lastFailureTime > this.recoveryTimeout) {
          // Transition to HALF_OPEN for testing recovery
          this.circuitBreaker.state = 'HALF_OPEN';
          this.halfOpenRequests = 0;
          this.logger.log(
            `Circuit breaker transitioning to HALF_OPEN for ${this.config.queueName}`,
          );
          return true;
        }
        // Still in recovery period: block requests
        return false;

      case 'HALF_OPEN':
        // Allow limited requests for testing service recovery
        return this.halfOpenRequests < this.halfOpenMaxRequests;

      default:
        // Unknown state: default to blocking requests
        return false;
    }
  }

  /**
   * Records successful job execution and manages circuit breaker state transitions
   * Called after each successful job completion to track system health
   * @private
   */
  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      // Count successful requests in HALF_OPEN state
      this.halfOpenRequests++;

      // Check if enough successful requests to consider service recovered
      if (this.halfOpenRequests >= this.halfOpenMaxRequests) {
        // Transition back to normal operation
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
        this.logger.log(
          `Circuit breaker transitioning to CLOSED for ${this.config.queueName}`,
        );
      }
    }
    // Note: In CLOSED state, we don't reset failure count on success
    // to maintain some memory of recent failures
  }

  /**
   * Records failed job execution and manages circuit breaker state transitions
   * Called after each job failure to track system degradation
   * @private
   */
  private recordFailure(): void {
    // Increment failure counter
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Check if failure threshold exceeded
    if (this.circuitBreaker.failures >= this.failureThreshold) {
      // Transition to OPEN state to prevent cascade failures
      this.circuitBreaker.state = 'OPEN';
      this.logger.warn(
        `Circuit breaker transitioning to OPEN for ${this.config.queueName} (${this.circuitBreaker.failures} failures)`,
      );
    }
  }

  /**
   * Health Monitoring System
   * =======================
   *
   * Continuous monitoring of worker health to detect and respond to issues:
   * - Periodic health checks every 30 seconds
   * - Failure rate monitoring with configurable thresholds
   * - Automatic alerts for degraded performance
   * - Recovery detection and status reporting
   */

  /**
   * Starts periodic health check monitoring
   * Monitors queue health and failure rates to detect system degradation
   * @private
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      // Skip health checks if worker is not active
      if (!this.isWorkerActive) return;

      try {
        // Get current queue metrics for health assessment
        const metrics = await this.getQueueMetrics();

        // Check for high failure rates indicating system issues
        if (metrics.failed > 10) {
          this.logger.warn(
            `High failure rate detected for ${this.config.queueName}: ${metrics.failed} failed jobs`,
          );
        }

        // Additional health checks could include:
        // - Queue depth monitoring (too many waiting jobs)
        // - Processing latency analysis
        // - Memory usage tracking
        // - External service dependency checks
      } catch (error) {
        this.logger.error(
          `Health check failed for ${this.config.queueName}:`,
          error,
        );
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stops the health check monitoring interval
   * Called during cleanup to prevent resource leaks
   * @private
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Metrics Collection System
   * ========================
   *
   * Continuous collection of performance metrics for monitoring and alerting:
   * - Queue statistics (waiting, active, completed, failed jobs)
   * - Processing performance indicators
   * - Error rates and patterns
   * - Resource utilization tracking
   */

  /**
   * Starts periodic metrics collection for monitoring dashboards
   * Collects comprehensive statistics about worker performance
   * @private
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      // Skip metrics collection if worker is not active
      if (!this.isWorkerActive) return;

      try {
        // Collect current queue metrics
        const metrics = await this.getQueueMetrics();

        // Log metrics for monitoring systems and dashboards
        this.logger.debug(`Worker ${this.config.queueName} metrics:`, metrics);

        // Metrics could be sent to external monitoring systems:
        // - Prometheus metrics endpoint
        // - CloudWatch/StackDriver
        // - ELK stack (Elasticsearch, Logstash, Kibana)
        // - Custom monitoring dashboards
      } catch (error) {
        this.logger.error(
          `Metrics collection failed for ${this.config.queueName}:`,
          error,
        );
      }
    }, 60000); // Collect every minute
  }

  /**
   * Stops the metrics collection interval
   * Called during cleanup to prevent resource leaks
   * @private
   */
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Remove event listeners to prevent memory leaks
   * Removes all event listeners from worker and queue events
   * @private
   */
  private removeEventListeners(): void {
    if (this.worker) {
      this.worker.removeAllListeners('completed');
      this.worker.removeAllListeners('failed');
      this.worker.removeAllListeners('error');
    }

    if (this.queueEvents) {
      this.queueEvents.removeAllListeners('waiting');
    }
  }

  /**
   * Public API for Circuit Breaker Status
   * =====================================
   *
   * Provides external visibility into circuit breaker state for monitoring
   * and administrative purposes. This method exposes the internal state
   * without allowing external modification.
   */

  /**
   * Gets the current circuit breaker status for monitoring and debugging
   * Returns comprehensive information about circuit breaker health
   * @returns Circuit breaker status object with state, failure count, and health indicator
   */
  getCircuitBreakerStatus(): any {
    return {
      state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      lastFailureTime: this.circuitBreaker.lastFailureTime,
      isHealthy: this.circuitBreaker.state !== 'OPEN',
    };
  }
}
