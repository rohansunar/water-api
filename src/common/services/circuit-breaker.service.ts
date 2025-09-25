import { Injectable, Logger } from '@nestjs/common';
import { CustomLoggerService } from '../logger/logger.service';
import { CircuitBreakerException, ExternalServiceException } from '../exceptions/business.exception';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before trying half-open (ms)
  monitoringPeriod: number;    // Time window to count failures (ms)
  successThreshold: number;    // Successes needed in half-open to close circuit
  timeout: number;             // Request timeout (ms)
  retryAttempts: number;       // Number of retry attempts
  retryDelay: number;          // Delay between retries (ms)
}

export interface ServiceCallResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  duration: number;
  timestamp: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 60000, // 1 minute
    successThreshold: 3,
    timeout: 5000, // 5 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  constructor(private readonly customLogger: CustomLoggerService) {}

  /**
   * Execute service call with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(serviceName, config);
    const startTime = Date.now();

    // Check if circuit should allow the request
    if (!circuit.canExecute()) {
      throw new CircuitBreakerException(
        serviceName,
        `Circuit breaker is ${circuit.state} for service ${serviceName}`,
      );
    }

    let lastError: any;
    const effectiveConfig = { ...this.defaultConfig, ...config };

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= effectiveConfig.retryAttempts + 1; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(operation, effectiveConfig.timeout);

        // Record success
        circuit.recordSuccess();
        const duration = Date.now() - startTime;

        // Log successful call
        this.customLogger.logInterModuleCommunication(
          'api',
          serviceName,
          'external_call',
          duration,
          true,
          {
            attempt,
            duration,
            userId: 'system',
          },
        );

        return result;
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;

        // Record failure
        circuit.recordFailure();

        // Log failed call
        this.customLogger.logInterModuleCommunication(
          'api',
          serviceName,
          'external_call',
          duration,
          false,
          {
            attempt,
            error: error.message,
            errorCode: error.code || error.name,
            duration,
          },
        );

        // If this is the last attempt or circuit is now open, throw
        if (attempt > effectiveConfig.retryAttempts || !circuit.canExecute()) {
          break;
        }

        // Wait before retry
        await this.delay(effectiveConfig.retryDelay * attempt);
      }
    }

    // All attempts failed
    const error = new ExternalServiceException(
      serviceName,
      `Service ${serviceName} is unavailable after ${effectiveConfig.retryAttempts + 1} attempts: ${lastError.message}`,
      circuit.state === CircuitState.OPEN, // Retryable if circuit is open
    );

    this.customLogger.logInterModuleCommunication(
      'api',
      serviceName,
      'external_call_failed',
      Date.now() - startTime,
      false,
      {
        error: error.message,
        circuitState: circuit.state,
        totalAttempts: effectiveConfig.retryAttempts + 1,
      },
    );

    throw error;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitStats(serviceName: string): any {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) {
      return null;
    }

    return {
      serviceName,
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      nextAttemptTime: circuit.nextAttemptTime,
      config: circuit.config,
    };
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllCircuitStats(): any[] {
    const stats = [];
    for (const [serviceName, circuit] of this.circuits) {
      stats.push(this.getCircuitStats(serviceName));
    }
    return stats;
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuit(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.reset();
      this.logger.log(`Circuit breaker reset for service: ${serviceName}`);
    }
  }

  /**
   * Get or create circuit breaker for service
   */
  private getOrCreateCircuit(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!this.circuits.has(serviceName)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      this.circuits.set(serviceName, new CircuitBreaker(serviceName, circuitConfig));
      this.logger.log(`Created circuit breaker for service: ${serviceName}`);
    }
    return this.circuits.get(serviceName)!;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class CircuitBreaker {
  public state: CircuitState = CircuitState.CLOSED;
  public failureCount = 0;
  public successCount = 0;
  public lastFailureTime?: Date;
  public lastSuccessTime?: Date;
  public nextAttemptTime?: Date;

  private readonly failureTimes: Date[] = [];
  private readonly successTimes: Date[] = [];

  constructor(
    public readonly serviceName: string,
    public readonly config: CircuitBreakerConfig,
  ) {}

  /**
   * Check if circuit can execute requests
   */
  canExecute(): boolean {
    const now = new Date();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          this.state = CircuitState.HALF_OPEN;
          this.successCount = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.lastSuccessTime = new Date();
    this.successTimes.push(this.lastSuccessTime);

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Clean up old failure records
      this.cleanupOldRecords();
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(): void {
    this.lastFailureTime = new Date();
    this.failureTimes.push(this.lastFailureTime);
    this.failureCount++;

    // Clean up old records
    this.cleanupOldRecords();

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failureTimes.length = 0;
    this.successTimes.length = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.state !== CircuitState.CLOSED) {
      return false;
    }

    const recentFailures = this.getRecentFailures();
    return recentFailures >= this.config.failureThreshold;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
  }

  /**
   * Get recent failures within monitoring period
   */
  private getRecentFailures(): number {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.config.monitoringPeriod);

    return this.failureTimes.filter((time) => time >= cutoff).length;
  }

  /**
   * Clean up old records outside monitoring period
   */
  private cleanupOldRecords(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.config.monitoringPeriod);

    this.failureTimes.filter((time) => time >= cutoff);
    this.successTimes.filter((time) => time >= cutoff);
  }
}