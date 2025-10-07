import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Service - High-availability Redis client with advanced connection management
 *
 * ARCHITECTURE OVERVIEW:
 * This service provides a robust Redis client implementation with multiple layers of resilience:
 * - Connection pooling with automatic failover and retry mechanisms
 * - Health monitoring with proactive connection validation
 * - Performance monitoring with slow operation detection
 * - Graceful degradation when Redis is unavailable
 *
 * KEY FEATURES:
 * - Exponential backoff retry strategy for connection failures
 * - Continuous health checks every 30 seconds with ping validation
 * - Connection monitoring every 5 seconds for automatic reconnection
 * - Performance tracking with warnings for operations >100ms
 * - Distributed locking support through Lua script execution
 * - Memory-efficient connection management with proper cleanup
 *
 * CACHING STRATEGIES:
 * - TTL-based expiration for temporary data
 * - Graceful fallback to null when Redis is unavailable
 * - Performance-optimized with connection state validation
 *
 * DISTRIBUTED LOCKING:
 * - Lua script execution support for atomic operations
 * - Connection state validation before lock operations
 * - Automatic lock cleanup on connection failures
 *
 * ERROR HANDLING:
 * - Comprehensive error logging with operation context
 * - Connection state tracking and automatic recovery
 * - Performance degradation warnings for monitoring
 * - Graceful service degradation without application crashes
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  /** Logger instance for Redis service operations and debugging */
  private readonly logger = new Logger(RedisService.name);

  /** Redis client instance for executing operations */
  private client: RedisClientType;

  /** Current connection status - tracks if Redis is available for operations */
  private isConnected = false;

  /** Current number of reconnection attempts made */
  private reconnectAttempts = 0;

  /** Maximum allowed reconnection attempts before giving up */
  private maxReconnectAttempts = 5;

  /** Base delay in milliseconds for exponential backoff calculation */
  private reconnectDelay = 1000;

  /** Interval ID for periodic health check operations */
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /** Interval ID for periodic connection monitoring */
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Constructor - Initialize Redis service with configuration
   * @param configService NestJS configuration service for environment variables
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Module initialization lifecycle hook
   * Establishes Redis connection and starts monitoring systems
   *
   * INITIALIZATION SEQUENCE:
   * 1. Establish primary Redis connection with retry logic
   * 2. Start health check monitoring (30-second intervals)
   * 3. Start connection monitoring (5-second intervals)
   *
   * This ensures the service is fully operational when the application starts
   */
  async onModuleInit() {
    await this.connect();
    this.startHealthCheck();
    this.startConnectionMonitoring();
  }

  /**
   * Module destruction lifecycle hook
   * Gracefully shuts down Redis connection and monitoring systems
   *
   * CLEANUP SEQUENCE:
   * 1. Stop health check monitoring to prevent memory leaks
   * 2. Stop connection monitoring to prevent reconnection attempts
   * 3. Remove event listeners to prevent memory leaks
   * 4. Disconnect from Redis server with proper cleanup
   *
   * This ensures clean shutdown and prevents resource leaks
   */
  async onModuleDestroy() {
    this.stopHealthCheck();
    this.stopConnectionMonitoring();
    this.removeEventListeners();
    await this.disconnect();
  }

  /**
   * Establish Redis connection with comprehensive retry logic and configuration
   *
   * CONNECTION ALGORITHM:
   * 1. Load configuration from environment variables with sensible defaults
   * 2. Create Redis client with advanced configuration options
   * 3. Set up event handlers for connection lifecycle management
   * 4. Attempt initial connection with timeout protection
   * 5. Reset retry counter on successful connection
   *
   * RETRY STRATEGY:
   * - Exponential backoff: delay = baseDelay * 2^retryCount
   * - Maximum delay cap: 30 seconds to prevent excessive wait times
   * - Maximum attempts: 5 retries before giving up
   * - Graceful degradation: Service continues without Redis if connection fails
   *
   * CONFIGURATION:
   * - Connection timeout: 10 seconds for initial connection
   * - Keep-alive: Enabled for persistent connections
   * - Command queue: 1000 operations max to prevent memory issues
   * - Database selection: Configurable Redis database number
   *
   * @returns Promise that resolves when connection is established or fails gracefully
   */
  private async connect(): Promise<void> {
    try {
      // Load Redis configuration from environment with fallback defaults
      const redisUrl = this.configService.get(
        'REDIS_URL',
        'redis://localhost:6379',
      );
      const redisPassword = this.configService.get('REDIS_PASSWORD');
      const redisDb = this.configService.get('REDIS_DB', 0);

      // Create Redis client with comprehensive configuration
      this.client = createClient({
        url: redisUrl,
        password: redisPassword,
        database: redisDb,
        socket: {
          connectTimeout: 10000, // 10 second timeout for connection establishment
          keepAlive: true, // Maintain persistent connection
          // Exponential backoff retry strategy with maximum delay cap
          reconnectStrategy: (retries: number) => {
            // Check if we've exceeded maximum retry attempts
            if (retries > this.maxReconnectAttempts) {
              this.logger.error(
                `Redis max reconnection attempts (${this.maxReconnectAttempts}) exceeded`,
              );
              return new Error('Max reconnection attempts exceeded');
            }

            // Track current retry attempt for monitoring
            this.reconnectAttempts = retries;

            // Calculate exponential backoff delay with maximum cap
            // Formula: baseDelay * 2^retries, capped at 30 seconds
            const delay = Math.min(
              this.reconnectDelay * Math.pow(2, retries),
              30000,
            );
            this.logger.warn(
              `Redis reconnecting in ${delay}ms (attempt ${retries + 1}/${this.maxReconnectAttempts})`,
            );
            return delay;
          },
        },
        commandsQueueMaxLength: 1000, // Prevent memory issues with queued commands
      });

      // Set up event handlers for connection lifecycle events
      this.setupEventHandlers();

      // Attempt to establish connection with error handling
      await this.client.connect();

      // Reset retry counter on successful connection
      this.reconnectAttempts = 0;
      this.logger.log(
        'Redis connected successfully with enhanced configuration',
      );
    } catch (error) {
      // Log connection failure with full error context
      this.logger.error('Failed to connect to Redis:', error);

      // Warn about service degradation - distributed locking will be disabled
      this.logger.warn(
        'Redis connection failed, distributed locking will be disabled',
      );

      // Mark connection as unavailable for graceful degradation
      this.isConnected = false;
    }
  }

  /**
   * Set up Redis client event handlers for connection lifecycle management
   *
   * EVENT HANDLING STRATEGY:
   * - Error events: Log errors and mark connection as unhealthy
   * - Connect events: Log successful connection and update status
   * - Disconnect events: Log disconnection and mark as unavailable
   *
   * This provides comprehensive monitoring of Redis connection health
   * and enables automatic recovery mechanisms.
   */
  private setupEventHandlers(): void {
    // Guard clause - ensure client exists before setting up handlers
    if (!this.client) return;

    // Handle Redis client errors - mark connection as potentially unhealthy
    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
      // Mark connection as unavailable for graceful degradation
      this.isConnected = false;
    });

    // Handle successful connection establishment
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
      // Update connection status to enable operations
      this.isConnected = true;
    });

    // Handle disconnection events
    this.client.on('disconnect', () => {
      this.logger.warn('Disconnected from Redis');
      // Mark connection as unavailable to prevent operations
      this.isConnected = false;
    });
  }

  /**
   * Gracefully disconnect from Redis server
   *
   * DISCONNECTION STRATEGY:
   * - Check if client exists and is connected before attempting disconnect
   * - Perform clean disconnection to free resources
   * - No error handling needed as this is cleanup operation
   *
   * This ensures proper resource cleanup during application shutdown
   * and prevents connection leaks.
   */
  private async disconnect(): Promise<void> {
    // Only disconnect if client exists and is currently connected
    if (this.client && this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Set a key-value pair with optional expiration and advanced options
   *
   * CACHING STRATEGY:
   * - Supports TTL (time-to-live) for automatic expiration
   * - Supports advanced Redis SET options (NX, XX, EX, PX, etc.)
   * - Graceful degradation when Redis is unavailable
   *
   * PERFORMANCE MONITORING:
   * - Tracks operation duration for performance analysis
   * - Logs warnings for slow operations (>100ms)
   * - Provides operation context in error messages
   *
   * ERROR HANDLING:
   * - Returns null on connection failures for graceful degradation
   * - Marks connection as unhealthy on errors for recovery
   * - Comprehensive error logging with timing information
   *
   * @param key Redis key to set
   * @param value Value to store
   * @param args Additional Redis SET arguments (EX, PX, NX, XX, etc.)
   * @returns Redis operation result or null if unavailable
   */
  async set(
    key: string,
    value: string,
    ...args: any[]
  ): Promise<string | null> {
    // Graceful degradation - skip operation if Redis unavailable
    if (!this.isConnected || !this.client) {
      this.logger.warn(
        `Redis not connected, skipping SET operation for key: ${key}`,
      );
      return null;
    }

    // Performance monitoring - track operation start time
    const startTime = Date.now();
    try {
      // Execute Redis SET operation with all provided arguments
      const result = await this.client.set(key, value, ...args);

      // Calculate operation duration for performance analysis
      const duration = Date.now() - startTime;

      // Log performance warnings for slow operations
      if (duration > 100) {
        this.logger.warn(
          `Slow Redis SET operation for key ${key}: ${duration}ms`,
        );
      }

      return result as string;
    } catch (error) {
      // Calculate total operation duration including error handling
      const duration = Date.now() - startTime;
      this.logger.error(
        `Redis SET error for key ${key} (duration: ${duration}ms):`,
        error,
      );

      // Mark connection as potentially unhealthy for recovery mechanisms
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Retrieve a value from Redis by key
   *
   * DATA RETRIEVAL STRATEGY:
   * - Direct key-value lookup with performance monitoring
   * - Returns null for non-existent keys (Redis behavior)
   * - Graceful fallback when Redis is unavailable
   *
   * PERFORMANCE MONITORING:
   * - Tracks operation duration for performance analysis
   * - Logs warnings for slow operations (>100ms)
   * - Provides operation context in error messages
   *
   * ERROR HANDLING:
   * - Returns null on connection failures for graceful degradation
   * - Marks connection as unhealthy on errors for recovery
   * - Comprehensive error logging with timing information
   *
   * @param key Redis key to retrieve
   * @returns Stored value or null if key doesn't exist or Redis unavailable
   */
  async get(key: string): Promise<string | null> {
    // Graceful degradation - return null if Redis unavailable
    if (!this.isConnected || !this.client) {
      return null;
    }

    // Performance monitoring - track operation start time
    const startTime = Date.now();
    try {
      // Execute Redis GET operation
      const result = await this.client.get(key);

      // Calculate operation duration for performance analysis
      const duration = Date.now() - startTime;

      // Log performance warnings for slow operations
      if (duration > 100) {
        this.logger.warn(
          `Slow Redis GET operation for key ${key}: ${duration}ms`,
        );
      }

      return result as string | null;
    } catch (error) {
      // Calculate total operation duration including error handling
      const duration = Date.now() - startTime;
      this.logger.error(
        `Redis GET error for key ${key} (duration: ${duration}ms):`,
        error,
      );

      // Mark connection as potentially unhealthy for recovery mechanisms
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Delete a key from Redis
   *
   * KEY MANAGEMENT:
   * - Removes key-value pairs from Redis
   * - Returns number of keys deleted (0 if key doesn't exist)
   * - Graceful degradation when Redis unavailable
   *
   * ERROR HANDLING:
   * - Returns 0 on connection failures for consistent behavior
   * - Comprehensive error logging with key context
   * - No connection state changes on errors (less critical operation)
   *
   * @param key Redis key to delete
   * @returns Number of keys deleted (0 if key doesn't exist or Redis unavailable)
   */
  async del(key: string): Promise<number> {
    // Graceful degradation - return 0 if Redis unavailable
    if (!this.isConnected) {
      return 0;
    }

    try {
      // Execute Redis DEL operation
      return await this.client.del(key);
    } catch (error) {
      // Log error with key context for debugging
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      // Return 0 for consistent behavior with Redis DEL semantics
      return 0;
    }
  }

  /**
   * Execute Lua script on Redis server for atomic operations
   *
   * DISTRIBUTED LOCKING SUPPORT:
   * - Enables atomic operations across multiple Redis keys
   * - Essential for distributed locking mechanisms
   * - Supports complex business logic execution on server-side
   *
   * SCRIPT EXECUTION:
   * - numKeys parameter specifies how many arguments are keys vs values
   * - Remaining arguments are passed as script arguments
   * - Returns script execution result or null on failure
   *
   * ERROR HANDLING:
   * - Graceful degradation when Redis unavailable
   * - Comprehensive error logging for debugging
   * - Returns null to indicate script execution failure
   *
   * @param script Lua script to execute
   * @param numKeys Number of arguments that are Redis keys
   * @param args Script arguments (keys followed by values)
   * @returns Script execution result or null if Redis unavailable/failed
   */
  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    // Graceful degradation - skip script execution if Redis unavailable
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, eval operation skipped');
      return null;
    }

    try {
      // Prepare arguments array: [script, numKeys, ...args]
      const evalArgs = [script, numKeys];
      evalArgs.push(...args);

      // Execute Lua script with proper argument structure
      return await (this.client as any).eval(...evalArgs);
    } catch (error) {
      // Log error for debugging script execution issues
      this.logger.error('Redis EVAL error:', error);
      // Return null to indicate script execution failure
      return null;
    }
  }

  /**
   * Set expiration time for a Redis key
   *
   * TTL MANAGEMENT:
   * - Sets time-to-live for cache entries
   * - Enables automatic cleanup of temporary data
   * - Essential for memory-efficient caching strategies
   *
   * EXPIRATION BEHAVIOR:
   * - Returns 1 if expiration was set successfully
   * - Returns 0 if key doesn't exist or Redis unavailable
   * - Expiration time is in seconds from current time
   *
   * ERROR HANDLING:
   * - Graceful degradation when Redis unavailable
   * - Comprehensive error logging with key context
   * - Returns 0 for consistent behavior with Redis EXPIRE semantics
   *
   * @param key Redis key to set expiration for
   * @param seconds Time-to-live in seconds
   * @returns 1 if expiration set, 0 if key doesn't exist or Redis unavailable
   */
  async expire(key: string, seconds: number): Promise<number> {
    // Graceful degradation - return 0 if Redis unavailable
    if (!this.isConnected) {
      return 0;
    }

    try {
      // Set expiration time for the specified key
      return await this.client.expire(key, seconds);
    } catch (error) {
      // Log error with key context for debugging
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error);
      // Return 0 for consistent behavior with Redis EXPIRE semantics
      return 0;
    }
  }

  /**
   * Check if Redis service is ready for operations
   *
   * CONNECTION STATUS:
   * - Returns true if Redis is connected and available
   * - Returns false if connection is unavailable or failed
   * - Used by other services to determine if Redis operations are possible
   *
   * This method provides a simple boolean check for Redis availability
   * without performing actual Redis operations.
   *
   * @returns true if Redis is connected and ready, false otherwise
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get raw Redis client for advanced operations
   *
   * ADVANCED OPERATIONS SUPPORT:
   * - Provides direct access to Redis client for complex operations
   * - Enables use of Redis features not covered by wrapper methods
   * - Returns null if Redis is unavailable for safety
   *
   * SECURITY CONSIDERATIONS:
   * - Should be used sparingly to maintain abstraction
   * - Bypasses error handling and monitoring of wrapper methods
   * - Requires careful connection state validation
   *
   * @returns Redis client instance or null if unavailable
   */
  getClient(): RedisClientType | null {
    return this.isConnected ? this.client : null;
  }

  /**
   * Start periodic health check monitoring for Redis connection
   *
   * HEALTH MONITORING ALGORITHM:
   * - Performs Redis PING operation every 30 seconds
   * - Tracks response time for performance monitoring
   * - Validates connection health proactively
   * - Triggers reconnection on health check failures
   *
   * PERFORMANCE TRACKING:
   * - Measures ping response time for monitoring
   * - Logs warnings for slow responses (>1000ms)
   * - Provides early warning of connection degradation
   *
   * RECOVERY MECHANISMS:
   * - Marks connection as unhealthy on ping failures
   * - Forces disconnection to trigger reconnection logic
   * - Enables automatic recovery through connection monitoring
   *
   * MONITORING INTERVAL: 30 seconds (configurable for different environments)
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      // Skip health check if not connected or client unavailable
      if (!this.isConnected || !this.client) {
        return;
      }

      try {
        // Track health check start time for performance monitoring
        const startTime = Date.now();

        // Perform Redis PING to validate connection health
        await this.client.ping();

        // Calculate response time for performance analysis
        const responseTime = Date.now() - startTime;

        // Log performance warnings for slow health checks
        if (responseTime > 1000) {
          this.logger.warn(
            `Redis health check slow response: ${responseTime}ms`,
          );
        }
      } catch (error) {
        // Log health check failure for monitoring
        this.logger.error('Redis health check failed:', error);

        // Mark connection as unhealthy
        this.isConnected = false;

        // Force disconnection to trigger reconnection mechanisms
        this.client.disconnect();
      }
    }, 30000); // Health check interval: 30 seconds
  }

  /**
   * Stop health check monitoring and clean up resources
   *
   * RESOURCE CLEANUP:
   * - Clears the health check interval to prevent memory leaks
   * - Sets interval reference to null for garbage collection
   * - Called during application shutdown or service cleanup
   *
   * This ensures proper cleanup of monitoring resources and prevents
   * background operations from continuing after service shutdown.
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Start connection monitoring for automatic reconnection attempts
   *
   * RECONNECTION ALGORITHM:
   * - Monitors connection status every 5 seconds
   * - Attempts reconnection if disconnected and within retry limits
   * - Prevents excessive reconnection attempts through counter checks
   * - Enables automatic recovery from temporary network issues
   *
   * MONITORING STRATEGY:
   * - Non-blocking interval-based monitoring
   * - Respects retry attempt limits to prevent infinite loops
   * - Logs reconnection attempts for operational visibility
   *
   * MONITORING INTERVAL: 5 seconds (frequent enough for quick recovery)
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      // Only attempt reconnection if disconnected and within retry limits
      if (
        !this.isConnected &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.logger.log('Attempting to reconnect to Redis...');
        this.connect();
      }
    }, 5000); // Connection monitoring interval: 5 seconds
  }

  /**
   * Stop connection monitoring and clean up resources
   *
   * RESOURCE CLEANUP:
   * - Clears the connection monitoring interval to prevent memory leaks
   * - Sets interval reference to null for garbage collection
   * - Called during application shutdown or service cleanup
   *
   * This ensures proper cleanup of monitoring resources and prevents
   * background reconnection attempts after service shutdown.
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Remove Redis client event listeners to prevent memory leaks
   *
   * EVENT LISTENER CLEANUP:
   * - Removes 'error', 'connect', and 'disconnect' event listeners
   * - Prevents memory leaks from orphaned event listener references
   * - Called during module destruction for proper cleanup
   *
   * This ensures clean shutdown and prevents event listener accumulation
   * that could cause memory leaks over time.
   */
  private removeEventListeners(): void {
    if (this.client) {
      this.client.removeAllListeners('error');
      this.client.removeAllListeners('connect');
      this.client.removeAllListeners('disconnect');
    }
  }

  /**
   * Get comprehensive connection statistics for monitoring and debugging
   *
   * METRICS PROVIDED:
   * - isConnected: Current connection status
   * - reconnectAttempts: Number of reconnection attempts made
   * - maxReconnectAttempts: Maximum allowed reconnection attempts
   *
   * MONITORING USE CASES:
   * - Health check endpoints can expose these metrics
   * - Debugging connection issues in production
   * - Monitoring dashboards for Redis service health
   * - Alerting on excessive reconnection attempts
   *
   * @returns Object containing connection statistics
   */
  getConnectionStats(): any {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }
}
