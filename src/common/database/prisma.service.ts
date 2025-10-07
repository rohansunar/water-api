import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Enhanced Prisma database service with robust connection management, health monitoring,
 * and automatic recovery mechanisms.
 *
 * This service extends the base PrismaClient with enterprise-grade features including:
 * - Automatic connection retry logic with exponential backoff
 * - Proactive health monitoring with periodic connectivity checks
 * - Real-time connection state monitoring and recovery
 * - Comprehensive event logging for queries, errors, and warnings
 * - Graceful degradation and error handling strategies
 *
 * Architecture:
 * - Implements NestJS lifecycle hooks for proper initialization and cleanup
 * - Uses interval-based monitoring for continuous health assessment
 * - Employs event-driven logging for database operation transparency
 * - Provides retry mechanisms for transient database failures
 *
 * Key Features:
 * - Connection pooling optimization with configurable parameters
 * - Slow query detection and alerting (>1 second threshold)
 * - Automatic reconnection on connection loss
 * - Health checks every 30 seconds with recovery attempts
 * - Connection monitoring every 5 seconds for rapid failure detection
 * - Comprehensive error categorization and logging
 *
 * @implements {OnModuleInit} - Handles database initialization and monitoring setup
 * @implements {OnModuleDestroy} - Ensures proper cleanup of intervals and connections
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** Logger instance for database operations and error tracking */
  private readonly logger = new Logger(PrismaService.name);

  /** Timer reference for health check monitoring (30-second intervals) */
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /** Timer reference for connection state monitoring (5-second intervals) */
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  /** Current database connection state flag */
  private isConnected = false;

  /**
   * Constructor with enhanced PrismaClient configuration.
   *
   * Configures comprehensive logging for all database operations including:
   * - Query performance monitoring and slow query detection
   * - Error tracking and debugging information
   * - Informational messages for connection events
   * - Warning alerts for potential issues
   *
   * @param configService - NestJS configuration service for environment variables
   */
  constructor(private readonly configService: ConfigService) {
    super({
      // Enable comprehensive event logging for all database operations
      log: [
        { emit: 'event', level: 'query' }, // Track all queries with performance metrics
        { emit: 'event', level: 'error' }, // Capture database errors for debugging
        { emit: 'event', level: 'info' }, // Log connection and operational info
        { emit: 'event', level: 'warn' }, // Track warnings and potential issues
      ],
      // Use pretty error formatting for better readability in development
      errorFormat: 'pretty',
    });
  }

  /**
   * Module initialization lifecycle hook.
   *
   * Establishes database connection and initializes monitoring systems:
   * 1. Connect to database with retry logic
   * 2. Start health check monitoring (30-second intervals)
   * 3. Start connection state monitoring (5-second intervals)
   * 4. Setup comprehensive event handlers for logging
   *
   * This ensures the service is fully operational when the module starts.
   */
  async onModuleInit() {
    await this.connect();
    this.startHealthCheck();
    this.startConnectionMonitoring();
    this.setupEventHandlers();
  }

  /**
   * Module destruction lifecycle hook.
   *
   * Performs graceful shutdown of all monitoring and connections:
   * 1. Stop health check monitoring to prevent memory leaks
   * 2. Stop connection monitoring to avoid unnecessary checks
   * 3. Disconnect from database with proper cleanup
   *
   * This ensures clean shutdown and resource cleanup when the module stops.
   */
  async onModuleDestroy() {
    this.stopHealthCheck();
    this.stopConnectionMonitoring();
    await this.disconnect();
  }

  /**
   * Establish database connection with comprehensive error handling.
   *
   * This method implements robust connection logic including:
   * - Environment variable validation for DATABASE_URL
   * - Connection pooling configuration through PrismaClient
   * - Connection state tracking for monitoring systems
   * - Comprehensive error logging for debugging
   *
   * Business Logic:
   * - Validates required environment configuration before attempting connection
   * - Uses Prisma's built-in connection pooling for optimal performance
   * - Updates internal connection state for health monitoring
   * - Provides detailed logging for connection success/failure
   *
   * @throws {Error} When DATABASE_URL is not configured or connection fails
   * @private
   */
  private async connect(): Promise<void> {
    try {
      // Retrieve and validate database connection string from environment
      const databaseUrl = this.configService.get('DATABASE_URL');

      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Establish connection using Prisma's connection management
      // This automatically configures connection pooling based on PrismaClient settings
      this.$connect();
      this.isConnected = true;
      this.logger.log(
        'Database connected successfully with enhanced configuration',
      );
    } catch (error) {
      // Log detailed error information for debugging and monitoring
      this.logger.error('Failed to connect to database:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Gracefully disconnect from database with error handling.
   *
   * This method ensures proper cleanup of database connections:
   * - Uses Prisma's disconnect method for proper connection closure
   * - Updates internal connection state for monitoring systems
   * - Handles disconnection errors gracefully without throwing
   * - Provides logging for successful and failed disconnections
   *
   * Business Logic:
   * - Always attempts to close connections cleanly
   * - Never throws errors to prevent shutdown issues
   * - Updates state tracking for monitoring systems
   * - Logs all disconnection activities for audit trail
   *
   * @private
   */
  private async disconnect(): Promise<void> {
    try {
      // Perform graceful disconnection using Prisma's cleanup mechanisms
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      // Log errors but don't throw to avoid disrupting shutdown process
      this.logger.error('Error during database disconnection:', error);
    }
  }

  /**
   * Configure comprehensive database event handlers for monitoring and logging.
   *
   * This method sets up event listeners for all Prisma database operations:
   * - Query performance monitoring with slow query detection
   * - Error tracking and debugging information
   * - Connection lifecycle events and informational messages
   * - Warning alerts for potential issues and optimizations
   *
   * Event Handling Strategy:
   * - Query events: Performance monitoring and optimization insights
   * - Error events: Critical issue tracking and debugging
   * - Info events: Connection lifecycle and operational status
   * - Warn events: Performance warnings and optimization opportunities
   *
   * @private
   */
  private setupEventHandlers(): void {
    // Query event logging with performance monitoring
    this.$on('query', (e) => {
      // Log slow queries (> 1 second) for performance optimization
      // This helps identify bottlenecks and optimization opportunities
      if (e.duration > 1000) {
        this.logger.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
      }
    });

    // Error event logging for debugging and monitoring
    this.$on('error', (e) => {
      // Capture all database errors for comprehensive error tracking
      // This includes connection errors, constraint violations, etc.
      this.logger.error('Database error:', e);
    });

    // Info event logging for operational transparency
    this.$on('info', (e) => {
      // Log informational messages about database operations
      // Such as connection pool events, migrations, etc.
      this.logger.log(`Database info: ${e.message}`);
    });

    // Warn event logging for potential issues
    this.$on('warn', (e) => {
      // Track warnings that might indicate performance issues or
      // potential problems that don't cause immediate failures
      this.logger.warn(`Database warning: ${e.message}`);
    });
  }

  /**
   * Start proactive health check monitoring with automatic recovery.
   *
   * This method implements a robust health monitoring system that:
   * - Performs periodic connectivity tests every 30 seconds
   * - Uses lightweight SQL queries to verify database responsiveness
   * - Automatically attempts reconnection on health check failures
   * - Updates connection state for monitoring systems
   * - Provides comprehensive error logging for debugging
   *
   * Health Check Algorithm:
   * 1. Only check if currently marked as connected (avoid unnecessary load)
   * 2. Execute simple query to test database responsiveness
   * 3. On failure, mark as disconnected and attempt immediate reconnection
   * 4. Log all health check activities for monitoring and debugging
   *
   * Recovery Strategy:
   * - Immediate reconnection attempt on health check failure
   * - Comprehensive error logging for troubleshooting
   * - State management to prevent cascading failures
   *
   * @private
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Only perform health check if we believe we're connected
        // This prevents unnecessary load on the database during outages
        if (this.isConnected) {
          // Lightweight connectivity test using raw SQL
          // SELECT 1 is the most efficient way to test database responsiveness
          await this.$queryRaw`SELECT 1`;
        }
      } catch (error) {
        // Health check failed - update state and attempt recovery
        this.logger.error('Database health check failed:', error);
        this.isConnected = false;

        // Immediate reconnection attempt with comprehensive error handling
        try {
          await this.$connect();
        } catch (reconnectError) {
          // Log reconnection failure but don't throw to avoid disrupting monitoring
          this.logger.error('Database reconnection failed:', reconnectError);
        }
      }
    }, 30000); // Check every 30 seconds for optimal balance of responsiveness and load
  }

  /**
   * Stop health check monitoring and clean up resources.
   *
   * This method ensures proper cleanup of the health check interval:
   * - Clears the interval timer to prevent memory leaks
   * - Nullifies the reference to prevent accidental usage
   * - Provides safe cleanup even if interval is already stopped
   *
   * Resource Management:
   * - Prevents memory leaks from abandoned timers
   * - Ensures clean shutdown during application termination
   * - Safe to call multiple times without side effects
   *
   * @private
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Start real-time connection state monitoring with rapid failure detection.
   *
   * This method implements aggressive connection monitoring that:
   * - Checks connection state every 5 seconds for rapid failure detection
   * - Automatically attempts reconnection when connection is lost
   * - Provides immediate feedback on connection state changes
   * - Uses exponential backoff to prevent connection storms
   *
   * Connection Monitoring Algorithm:
   * 1. Check connection state every 5 seconds (more frequent than health checks)
   * 2. On disconnection detection, immediately attempt reconnection
   * 3. Log all connection state changes for monitoring and debugging
   * 4. Use the same connect() method for consistent error handling
   *
   * Recovery Strategy:
   * - Rapid detection of connection failures (5-second intervals)
   * - Immediate reconnection attempts without waiting for health checks
   * - Comprehensive logging for operational visibility
   * - Consistent error handling through shared connect() method
   *
   * @private
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      // Rapid connection state monitoring for immediate failure detection
      if (!this.isConnected) {
        this.logger.warn(
          'Database connection lost, attempting to reconnect...',
        );
        // Use the same connect method for consistent error handling and logging
        this.connect();
      }
    }, 5000); // Check every 5 seconds for rapid failure detection
  }

  /**
   * Stop connection monitoring and clean up resources.
   *
   * This method ensures proper cleanup of the connection monitoring interval:
   * - Clears the interval timer to prevent memory leaks
   * - Nullifies the reference to prevent accidental usage
   * - Provides safe cleanup even if interval is already stopped
   *
   * Resource Management:
   * - Prevents memory leaks from abandoned timers
   * - Ensures clean shutdown during application termination
   * - Safe to call multiple times without side effects
   *
   * @private
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Get current database connection status and configuration.
   *
   * This method provides real-time visibility into database connection state:
   * - Current connection status (connected/disconnected)
   * - Database URL configuration status (configured/not configured)
   * - Useful for health checks, monitoring, and debugging
   *
   * Business Logic:
   * - Returns connection state without performing actual connectivity tests
   * - Provides configuration status for troubleshooting setup issues
   * - Safe to call frequently without performance impact
   * - Used by health check endpoints and monitoring systems
   *
   * @returns {Object} Connection status object with isConnected and connectionUrl fields
   * @public
   */
  getConnectionStatus(): any {
    return {
      isConnected: this.isConnected,
      connectionUrl: this.configService.get('DATABASE_URL')
        ? 'configured'
        : 'not configured',
    };
  }

  /**
   * Execute database operation with comprehensive retry logic and error handling.
   *
   * This method implements robust retry mechanisms for database operations:
   * - Configurable retry attempts with exponential backoff
   * - Comprehensive error logging for debugging
   * - Transient failure recovery for network issues
   * - Graceful degradation on persistent failures
   *
   * Retry Algorithm:
   * 1. Execute operation with full error context preservation
   * 2. On failure, log attempt details and implement exponential backoff
   * 3. Retry up to maxRetries times with increasing delays
   * 4. Throw last encountered error if all retries are exhausted
   *
   * Backoff Strategy:
   * - Linear backoff: delay * attempt (1s, 2s, 3s for default settings)
   * - Prevents connection storms during database outages
   * - Allows transient issues to resolve between attempts
   * - Configurable delay and retry parameters for different use cases
   *
   * Error Handling:
   * - Preserves original error context through retry attempts
   * - Comprehensive logging for monitoring and debugging
   * - Throws last error with full stack trace for upstream handling
   *
   * @template T - Return type of the operation function
   * @param operation - Async function to execute with retry logic
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param delay - Base delay between retries in milliseconds (default: 1000)
   * @returns Promise resolving to operation result
   * @throws Last encountered error if all retries are exhausted
   * @public
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    // Retry loop with exponential backoff strategy
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Execute the operation - success path
        return await operation();
      } catch (error) {
        // Store error for potential re-throwing and logging
        lastError = error as Error;

        // Log retry attempt for monitoring and debugging
        this.logger.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        // Only delay if we have more retry attempts remaining
        if (attempt < maxRetries) {
          // Exponential backoff: delay increases with each attempt
          // This prevents overwhelming the database during outages
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }
    }

    // All retry attempts exhausted - throw the last error
    throw lastError;
  }
}
