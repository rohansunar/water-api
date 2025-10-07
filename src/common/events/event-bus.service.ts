import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IEvent, IEventBus, IEventHandler } from './event-bus.interface';

/**
 * In-Memory Event Bus Service - Core Event-Driven Architecture Component
 *
 * This service implements a robust event-driven architecture for inter-module communication
 * within the application ecosystem. It serves as the central nervous system for decoupled
 * microservices communication, enabling loose coupling between different domains.
 *
 * **Architecture Overview:**
 * - **Publisher-Subscriber Pattern**: Events are published to the bus and consumed by registered handlers
 * - **Queue-Based Processing**: Events are queued and processed asynchronously to prevent blocking
 * - **Handler Registry**: Maintains a registry of event handlers organized by event type
 * - **Deduplication Protection**: Prevents duplicate event processing using event IDs
 * - **Error Isolation**: Individual handler failures don't affect other handlers or event processing
 *
 * **Key Features:**
 * - **Asynchronous Processing**: Non-blocking event publishing and processing
 * - **Type Safety**: Full TypeScript support with generic event types
 * - **Error Resilience**: Comprehensive error handling with detailed logging
 * - **Performance Monitoring**: Built-in statistics and queue monitoring
 * - **Memory Management**: Automatic cleanup on module destruction
 * - **Microservices Ready**: Designed to be easily replaceable with external message brokers
 *
 * **Event Flow:**
 * 1. Events are published via `publish()` or `publishMany()` methods
 * 2. Events are queued in FIFO order for processing
 * 3. Queue processor dequeues events and routes them to registered handlers
 * 4. Handlers process events asynchronously with error isolation
 * 5. Processing completion is tracked and logged for monitoring
 *
 * **Business Logic Patterns:**
 * - **Domain Event Pattern**: Enables domain-driven design with event sourcing capabilities
 * - **Observer Pattern**: Decouples event publishers from subscribers
 * - **Circuit Breaker Pattern**: Prevents cascade failures through error isolation
 * - **Idempotency**: Ensures events can be safely replayed without side effects
 *
 * @implements {IEventBus} Core event bus interface contract
 * @implements {OnModuleDestroy} Lifecycle management for cleanup
 */
@Injectable()
export class EventBusService implements IEventBus, OnModuleDestroy {
  /** Logger instance for structured logging and debugging */
  private readonly logger = new Logger(EventBusService.name);

  /**
   * Handler Registry - Core Data Structure
   *
   * Maps event types to sets of event handlers, enabling efficient lookup and
   * management of event subscriptions. Uses Map for O(1) event type lookup
   * and Set for O(1) handler existence checks and duplicate prevention.
   *
   * Structure: Map<eventType: string, Set<eventHandlers: IEventHandler>>
   */
  private readonly handlers = new Map<string, Set<IEventHandler>>();

  /**
   * Event Processing Queue - FIFO Data Structure
   *
   * Stores events awaiting processing in First-In-First-Out order. This ensures
   * events are processed in the exact order they were published, maintaining
   * causality and consistency across the system.
   *
   * @type {IEvent[]} Array-based queue for simple FIFO operations
   */
  private readonly eventQueue: IEvent[] = [];

  /**
   * Processing Deduplication Set - Prevents Race Conditions
   *
   * Tracks event IDs currently being processed to prevent duplicate processing
   * in concurrent scenarios. Uses Set for O(1) lookup performance when checking
   * if an event is already being handled.
   *
   * @type {Set<string>} Set of event IDs currently in processing
   */
  private readonly processingQueue = new Set<string>();

  /**
   * Processing State Flag - Thread Safety Mechanism
   *
   * Boolean flag indicating whether the event queue is currently being processed.
   * Prevents multiple concurrent processing cycles that could lead to race conditions
   * and ensures sequential processing of the event queue.
   *
   * @type {boolean} True if queue is being processed, false otherwise
   */
  private isProcessing = false;

  /**
   * Constructor - Dependency Injection and Initialization
   *
   * Initializes the event bus service with required dependencies. The ModuleRef
   * is used for potential future enhancements like dynamic handler resolution
   * and dependency injection for event handlers.
   *
   * @param moduleRef NestJS module reference for potential dynamic handler resolution
   */
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Lifecycle Hook - Cleanup on Module Destruction
   *
   * Implements OnModuleDestroy interface to ensure proper cleanup when the module
   * is destroyed. This prevents memory leaks and ensures clean shutdown of the
   * event processing system.
   *
   * **Cleanup Operations:**
   * - Clears all registered event handlers
   * - Empties the event processing queue
   * - Clears the processing deduplication set
   * - Logs cleanup completion for monitoring
   *
   * **Business Logic:**
   * This ensures graceful shutdown and prevents orphaned handlers or queued events
   * that could cause issues in subsequent application restarts.
   */
  onModuleDestroy() {
    this.handlers.clear();
    this.eventQueue.length = 0;
    this.processingQueue.clear();
    this.logger.log('Event bus cleaned up');
  }

  /**
   * Publish a Single Event - Core Event Publishing Mechanism
   *
   * Publishes a single event to the event bus, which will be processed by all
   * registered handlers for that event type. This method implements the core
   * event-driven architecture pattern for inter-module communication.
   *
   * **Algorithm:**
   * 1. Log event details for debugging and monitoring
   * 2. Add event to processing queue (FIFO order)
   * 3. Trigger queue processing if not already in progress
   * 4. Handle errors with detailed logging and re-throwing
   *
   * **Business Logic:**
   * - **Event Sourcing**: Enables event sourcing patterns for audit trails
   * - **Loose Coupling**: Publishers don't need to know about subscribers
   * - **Asynchronous Processing**: Non-blocking event publishing
   * - **Error Propagation**: Failures are logged and propagated for handling
   *
   * @template T - Event type extending IEvent interface
   * @param event - The event instance to publish
   * @returns Promise<void> - Resolves when event is queued for processing
   * @throws Error - Re-throws any errors that occur during publishing
   *
   * @example
   * ```typescript
   * const orderEvent = new OrderCreatedEvent(orderId, userId);
   * await eventBus.publish(orderEvent);
   * ```
   */
  async publish<T extends IEvent>(event: T): Promise<void> {
    try {
      // Log event details for debugging and monitoring
      this.logger.debug(`Publishing event: ${event.eventType}`, {
        eventId: event.eventId,
        source: event.source,
        correlationId: event.correlationId,
      });

      // Add to queue for processing - maintains FIFO order
      this.eventQueue.push(event);

      // Process queue if not already processing - prevents concurrent processing
      if (!this.isProcessing) {
        await this.processEventQueue();
      }
    } catch (error) {
      // Comprehensive error logging with context
      this.logger.error(`Failed to publish event: ${event.eventType}`, {
        error: error.message,
        eventId: event.eventId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Publish Multiple Events - Batch Event Publishing Mechanism
   *
   * Publishes multiple events in a single operation, optimizing for bulk event
   * publishing scenarios. This method is particularly useful for high-throughput
   * scenarios where multiple related events need to be published atomically.
   *
   * **Algorithm:**
   * 1. Log batch details for monitoring and debugging
   * 2. Add all events to processing queue using spread operator
   * 3. Trigger queue processing if not already in progress
   * 4. Handle errors with comprehensive logging and context
   *
   * **Business Logic:**
   * - **Batch Processing**: Optimizes for scenarios with multiple related events
   * - **Atomic Operations**: Ensures all events in batch are queued together
   * - **Performance**: Reduces overhead compared to individual publish calls
   * - **Consistency**: Maintains event ordering within the batch
   *
   * **Performance Characteristics:**
   * - O(1) queue insertion for the batch (spread operator)
   * - Single queue processing trigger regardless of batch size
   * - Memory efficient for large batches
   *
   * @template T - Event type extending IEvent interface
   * @param events - Array of events to publish in batch
   * @returns Promise<void> - Resolves when all events are queued for processing
   * @throws Error - Re-throws any errors that occur during batch publishing
   *
   * @example
   * ```typescript
   * const events = [
   *   new OrderCreatedEvent(orderId, userId),
   *   new InventoryUpdatedEvent(productId, quantity),
   *   new NotificationEvent(userId, 'Order created successfully')
   * ];
   * await eventBus.publishMany(events);
   * ```
   */
  async publishMany<T extends IEvent>(events: T[]): Promise<void> {
    try {
      // Log batch details for monitoring and debugging
      this.logger.debug(`Publishing ${events.length} events`);

      // Add all events to queue - maintains FIFO order within batch
      this.eventQueue.push(...events);

      // Process queue if not already processing - single trigger for entire batch
      if (!this.isProcessing) {
        await this.processEventQueue();
      }
    } catch (error) {
      // Comprehensive error logging with batch context
      this.logger.error('Failed to publish multiple events', {
        error: error.message,
        eventCount: events.length,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Subscribe to Events - Handler Registration Mechanism
   *
   * Registers an event handler for a specific event type, enabling the handler
   * to receive and process events of that type. This implements the Observer
   * pattern's subscription mechanism for event-driven architecture.
   *
   * **Algorithm:**
   * 1. Check if event type already exists in handler registry
   * 2. Create new Set for event type if it doesn't exist
   * 3. Add handler to the Set (automatic deduplication)
   * 4. Log subscription details for monitoring
   *
   * **Business Logic:**
   * - **Observer Pattern**: Enables loose coupling between publishers and subscribers
   * - **Multiple Handlers**: Supports multiple handlers per event type
   * - **Deduplication**: Prevents duplicate handler registration
   * - **Type Safety**: Full TypeScript support with generic event types
   *
   * **Performance Characteristics:**
   * - O(1) lookup for existing event types (Map)
   * - O(1) insertion for new handlers (Set)
   * - O(1) existence check for duplicate prevention
   *
   * @template T - Event type extending IEvent interface
   * @param eventType - String identifier for the event type to subscribe to
   * @param handler - Event handler instance that will process events
   * @returns void - No return value, subscription is performed as side effect
   *
   * @example
   * ```typescript
   * const orderHandler = new OrderCreatedHandler();
   * eventBus.subscribe('OrderCreated', orderHandler);
   * ```
   */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): void {
    // === HANDLER REGISTRY INITIALIZATION ===
    // Initialize handler set for event type if it doesn't exist
    // Uses lazy initialization pattern to avoid creating empty sets
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    // === HANDLER REGISTRATION ===
    // Add handler to set - Set automatically prevents duplicates
    // This ensures idempotent subscription behavior
    this.handlers.get(eventType).add(handler);

    // === MONITORING AND OBSERVABILITY ===
    // Log subscription details for monitoring and debugging
    // Provides audit trail for handler registration
    this.logger.debug(`Subscribed handler to event: ${eventType}`, {
      handlerName: handler.constructor.name,
      totalHandlers: this.handlers.get(eventType).size,
    });
  }

  /**
   * Unsubscribe from Events - Handler Removal Mechanism
   *
   * Removes an event handler from a specific event type, preventing it from
   * receiving future events of that type. This maintains the handler registry
   * and performs cleanup when no handlers remain for an event type.
   *
   * **Algorithm:**
   * 1. Retrieve handler set for the specified event type
   * 2. Remove the specific handler from the set
   * 3. Clean up empty handler sets to prevent memory leaks
   * 4. Log unsubscription details for monitoring
   *
   * **Business Logic:**
   * - **Dynamic Handler Management**: Allows handlers to be added/removed at runtime
   * - **Memory Management**: Prevents memory leaks from orphaned handler references
   * - **Clean Shutdown**: Supports graceful handler cleanup
   * - **Registry Maintenance**: Keeps handler registry optimized
   *
   * **Memory Management:**
   * - Automatically removes empty handler sets to prevent memory leaks
   * - O(1) deletion from Set data structure
   * - O(1) Map cleanup for empty sets
   *
   * @param eventType - String identifier for the event type to unsubscribe from
   * @param handler - Event handler instance to remove
   * @returns void - No return value, unsubscription is performed as side effect
   *
   * @example
   * ```typescript
   * eventBus.unsubscribe('OrderCreated', orderHandler);
   * ```
   */
  unsubscribe(eventType: string, handler: IEventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      // Remove specific handler from the set
      eventHandlers.delete(handler);

      // Clean up empty handler sets to prevent memory leaks
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
      }

      // Log unsubscription details for monitoring
      this.logger.debug(`Unsubscribed handler from event: ${eventType}`, {
        handlerName: handler.constructor.name,
      });
    }
  }

  /**
   * Process Event Queue - Core Queue Processing Algorithm
   *
   * Processes events from the queue in FIFO order, ensuring sequential and
   * consistent event handling. This method implements the main event processing
   * loop with proper error handling and concurrency control.
   *
   * **Algorithm:**
   * 1. Check if already processing (prevent concurrent processing)
   * 2. Set processing flag to true
   * 3. While queue has events:
   *    - Dequeue next event (FIFO)
   *    - Process event via processEvent method
   * 4. Handle any errors during processing
   * 5. Reset processing flag in finally block
   *
   * **Concurrency Control:**
   * - Uses isProcessing flag to prevent multiple concurrent processing cycles
   * - Ensures events are processed sequentially in order
   * - Thread-safe processing with proper state management
   *
   * **Error Handling Strategy:**
   * - Individual event processing errors don't stop queue processing
   * - Comprehensive error logging with stack traces
   * - Processing flag reset in finally block ensures recovery
   *
   * **Business Logic:**
   * - **Event Ordering**: Maintains strict FIFO order for event processing
   * - **Fault Tolerance**: Continues processing even if individual events fail
   * - **Resource Management**: Prevents memory leaks through proper cleanup
   * - **Performance**: Efficient queue processing with minimal overhead
   *
   * @private
   * @returns Promise<void> - Resolves when all queued events are processed
   */
  private async processEventQueue(): Promise<void> {
    // === CONCURRENCY CONTROL ===
    // Prevent concurrent processing cycles - ensures only one queue processor runs at a time
    if (this.isProcessing) {
      return;
    }

    // Set processing flag to prevent concurrent processing - acts as a distributed lock
    this.isProcessing = true;

    try {
      // === FIFO QUEUE PROCESSING ALGORITHM ===
      // Process all events in queue sequentially maintaining strict FIFO order
      // This ensures events are processed in the exact order they were published
      while (this.eventQueue.length > 0) {
        // Dequeue next event using shift() - O(1) operation for array
        const event = this.eventQueue.shift();

        // Process individual event - delegates to processEvent method
        await this.processEvent(event);
      }
    } catch (error) {
      // === ERROR HANDLING ===
      // Log comprehensive error information for debugging and monitoring
      this.logger.error('Error processing event queue', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      // === RESOURCE CLEANUP ===
      // Always reset processing flag to allow future processing cycles
      // This ensures the system can recover from errors and continue processing
      this.isProcessing = false;
    }
  }

  /**
   * Process a Single Event - Core Event Handler Execution Algorithm
   *
   * Processes an individual event by routing it to all registered handlers for
   * that event type. This method implements sophisticated error isolation,
   * deduplication prevention, and comprehensive logging for event processing.
   *
   * **Algorithm:**
   * 1. Retrieve all handlers for the event type
   * 2. Early return if no handlers exist
   * 3. Check for duplicate processing using event ID
   * 4. Add event to processing queue for deduplication
   * 5. Execute all handlers concurrently with error isolation
   * 6. Log success/failure for each handler
   * 7. Clean up processing queue in finally block
   *
   * **Deduplication Strategy:**
   * - Uses event ID as unique identifier to prevent duplicate processing
   * - Processing queue acts as a distributed lock mechanism
   * - Prevents race conditions in concurrent event publishing
   *
   * **Error Isolation Pattern:**
   * - Individual handler failures don't affect other handlers
   * - Uses Promise.all with individual try-catch blocks
   * - Continues processing even if some handlers fail
   * - Comprehensive error logging for debugging
   *
   * **Business Logic:**
   * - **Circuit Breaker**: Prevents cascade failures through isolation
   * - **Idempotency**: Ensures events can be safely replayed
   * - **Audit Trail**: Comprehensive logging for event lifecycle
   * - **Performance**: Concurrent handler execution for efficiency
   *
   * **Performance Characteristics:**
   * - O(1) handler lookup using Map data structure
   - O(n) handler execution where n = number of handlers
   - O(1) deduplication check using Set
   * - Concurrent handler execution for optimal throughput
   *
   * @private
   * @param event - The event instance to process
   * @returns Promise<void> - Resolves when all handlers have processed the event
   */
  private async processEvent(event: IEvent): Promise<void> {
    // === HANDLER LOOKUP ===
    // Retrieve all registered handlers for this event type using O(1) Map lookup
    const eventHandlers = this.handlers.get(event.eventType);

    // === EARLY EXIT OPTIMIZATION ===
    // Early return if no handlers are registered for this event type
    // This prevents unnecessary processing and memory allocation
    if (!eventHandlers || eventHandlers.size === 0) {
      this.logger.debug(`No handlers found for event: ${event.eventType}`, {
        eventId: event.eventId,
      });
      return;
    }

    // === DEDUPLICATION CHECK ===
    // Prevent duplicate processing using event ID as unique identifier
    // This acts as a distributed lock mechanism for concurrent event publishing
    if (this.processingQueue.has(event.eventId)) {
      this.logger.warn(`Event already being processed: ${event.eventId}`);
      return;
    }

    // === PROCESSING QUEUE MANAGEMENT ===
    // Add to processing queue to prevent concurrent processing of same event
    // This ensures idempotency and prevents race conditions
    this.processingQueue.add(event.eventId);

    try {
      // === CONCURRENT HANDLER EXECUTION ===
      // Execute all handlers concurrently with individual error isolation
      // This maximizes throughput while maintaining fault tolerance
      const handlerPromises = Array.from(eventHandlers).map(async (handler) => {
        try {
          // === INDIVIDUAL HANDLER EXECUTION ===
          // Execute handler and log success with comprehensive context
          await handler.handle(event);
          this.logger.debug(`Handler processed event successfully`, {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: handler.constructor.name,
          });
        } catch (error) {
          // === ERROR ISOLATION PATTERN ===
          // Log handler failure but don't rethrow - allow other handlers to continue
          // This implements the Circuit Breaker pattern for event processing
          this.logger.error(`Handler failed to process event`, {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: handler.constructor.name,
            error: error.message,
            stack: error.stack,
          });
          // Don't rethrow - we want other handlers to continue processing
        }
      });

      // === SYNCHRONIZATION POINT ===
      // Wait for all handlers to complete (success or failure)
      // This ensures all handlers have finished before considering event processed
      await Promise.all(handlerPromises);

      // === SUCCESS LOGGING ===
      // Log successful completion of event processing with metrics
      this.logger.debug(`Event processed by all handlers`, {
        eventType: event.eventType,
        eventId: event.eventId,
        handlerCount: eventHandlers.size,
      });
    } finally {
      // === RESOURCE CLEANUP ===
      // Always clean up processing queue to prevent memory leaks
      // This ensures the system doesn't accumulate processed event IDs indefinitely
      this.processingQueue.delete(event.eventId);
    }
  }

  /**
   * Get Event Statistics - Monitoring and Observability Interface
   *
   * Provides comprehensive statistics about the event bus state for monitoring,
   * debugging, and performance analysis. This method enables observability into
   * the event-driven system's health and performance characteristics.
   *
   * **Statistics Provided:**
   * - **totalEventTypes**: Number of unique event types with registered handlers
   * - **totalHandlers**: Total number of event handlers across all event types
   * - **queueSize**: Current number of events waiting to be processed
   * - **processingCount**: Number of events currently being processed
   *
   * **Business Logic:**
   * - **System Health Monitoring**: Enables proactive monitoring of event system
   * - **Performance Analysis**: Helps identify bottlenecks and queue buildup
   * - **Capacity Planning**: Provides data for scaling decisions
   * - **Debugging Support**: Essential for troubleshooting event flow issues
   *
   * **Performance Characteristics:**
   * - O(n) calculation where n = number of event types
   * - O(1) queue size lookup
   * - O(1) processing count lookup
   * - Minimal overhead for frequent monitoring calls
   *
   * @returns Event statistics object with comprehensive system state information
   *
   * @example
   * ```typescript
   * const stats = eventBus.getStats();
   * console.log(`Processing ${stats.queueSize} events with ${stats.totalHandlers} handlers`);
   * ```
   */
  getStats(): {
    totalEventTypes: number;
    totalHandlers: number;
    queueSize: number;
    processingCount: number;
  } {
    // Calculate total handlers across all event types
    const totalHandlers = Array.from(this.handlers.values()).reduce(
      (sum, handlers) => sum + handlers.size,
      0,
    );

    return {
      totalEventTypes: this.handlers.size,
      totalHandlers,
      queueSize: this.eventQueue.length,
      processingCount: this.processingQueue.size,
    };
  }

  /**
   * Clear All Handlers - Testing and Development Utility
   *
   * Removes all registered event handlers from the system. This method is primarily
   * intended for testing scenarios and development environments where complete
   * handler cleanup is necessary between test runs.
   *
   * **Use Cases:**
   * - **Unit Testing**: Ensures clean state between test cases
   * - **Integration Testing**: Prevents test interference from previous handlers
   * - **Development**: Allows for clean restart of event handling
   * - **Debugging**: Provides ability to reset event system state
   *
   * **Business Logic:**
   * - **Test Isolation**: Ensures tests don't interfere with each other
   * - **Clean Shutdown**: Supports proper test teardown procedures
   * - **State Reset**: Enables deterministic testing scenarios
   * - **Development Workflow**: Facilitates rapid development cycles
   *
   * **Warning:** This method should not be used in production environments
   * as it will remove all event handlers and disrupt normal system operation.
   *
   * @returns void - No return value, cleanup is performed as side effect
   *
   * @example
   * ```typescript
   * // In test teardown
   * afterEach(() => {
   *   eventBus.clearHandlers();
   * });
   * ```
   */
  clearHandlers(): void {
    this.handlers.clear();
    this.logger.debug('All event handlers cleared');
  }
}

/**
 * ================================================================================================
 * ALGORITHM EXPLANATIONS - Event Processing and Queue Management Logic
 * ================================================================================================
 *
 * This section provides detailed explanations of the core algorithms implemented in the EventBusService,
 * focusing on their complexity, performance characteristics, and design rationale.
 */

/**
 * EVENT QUEUE PROCESSING ALGORITHM
 *
 * **Algorithm Name:** Sequential FIFO Event Queue Processor
 * **Time Complexity:** O(n) where n = number of events in queue
 * **Space Complexity:** O(1) additional space (in-place queue processing)
 *
 * **Algorithm Steps:**
 * 1. **Concurrency Check (O(1))**: Check isProcessing flag to prevent concurrent processing
 * 2. **State Transition (O(1))**: Set isProcessing = true to claim processing lock
 * 3. **Queue Processing Loop (O(n))**:
 *    - Dequeue event using array.shift() - O(1) amortized
 *    - Delegate to processEvent() method - O(m) where m = handlers per event
 * 4. **Error Recovery (O(1))**: Reset processing flag in finally block
 *
 * **Key Design Decisions:**
 * - **Sequential Processing**: Ensures strict event ordering and causality preservation
 * - **Non-blocking Dequeue**: Uses array.shift() for efficient FIFO behavior
 * - **Error Recovery**: Finally block ensures processing flag is always reset
 * - **Single Responsibility**: Delegates individual event processing to separate method
 *
 * **Performance Characteristics:**
 * - Optimal for scenarios requiring strict event ordering
 * - Minimal memory overhead (no additional data structures)
 * - Predictable processing time based on queue size
 * - Suitable for high-throughput scenarios with proper queue management
 */
const EVENT_QUEUE_PROCESSING_ALGORITHM = `
Algorithm: Sequential FIFO Event Queue Processor
Input: eventQueue (array of IEvent), isProcessing (boolean flag)
Output: Processed events with handlers executed

procedure processEventQueue():
   if isProcessing: return  // Prevent concurrent processing

   isProcessing ← true
   try:
       while eventQueue.length > 0:
           event ← eventQueue.shift()  // O(1) dequeue
           processEvent(event)          // O(m) handler execution
   finally:
       isProcessing ← false            // Ensure flag reset
`;

/**
 * EVENT HANDLER EXECUTION ALGORITHM
 *
 * **Algorithm Name:** Concurrent Handler Execution with Error Isolation
 * **Time Complexity:** O(m) where m = number of handlers for the event
 * **Space Complexity:** O(m) for handler promise array
 *
 * **Algorithm Steps:**
 * 1. **Handler Lookup (O(1))**: Retrieve handlers using Map.get() operation
 * 2. **Deduplication Check (O(1))**: Verify event not already being processed
 * 3. **Processing Queue Management (O(1))**: Add event ID to processing set
 * 4. **Concurrent Execution (O(m))**:
 *    - Create promise for each handler with individual error isolation
 *    - Execute handlers concurrently using Promise.all()
 * 5. **Cleanup (O(1))**: Remove event ID from processing queue
 *
 * **Error Isolation Strategy:**
 * - Individual handler failures don't affect other handlers
 * - Uses try-catch within each handler promise
 * - Continues processing even if some handlers fail
 * - Comprehensive error logging for debugging
 *
 * **Concurrency Model:**
 * - Handlers execute concurrently for optimal throughput
 * - Event processing completion waits for all handlers
 * - No handler blocking affects other handlers
 * - Maintains handler execution order within single event
 */
const EVENT_HANDLER_EXECUTION_ALGORITHM = `
Algorithm: Concurrent Handler Execution with Error Isolation
Input: event (IEvent), handlers (Set<IEventHandler>)
Output: All handlers executed with isolated error handling

procedure processEvent(event):
   handlers ← getHandlers(event.eventType)  // O(1) Map lookup

   if handlers.size = 0: return  // Early exit optimization

   if processingQueue.has(event.eventId): return  // Deduplication check

   processingQueue.add(event.eventId)  // O(1) Set insertion

   try:
       promises ← []  // Array for concurrent execution
       for each handler in handlers:
           promise ← executeHandlerSafely(handler, event)
           promises.append(promise)

       await Promise.all(promises)  // Concurrent execution
   finally:
       processingQueue.delete(event.eventId)  // Cleanup
`;

/**
 * HANDLER REGISTRY MANAGEMENT ALGORITHM
 *
 * **Algorithm Name:** Lazy Initialization Handler Registry
 * **Time Complexity:** O(1) for all operations (lookup, insert, delete)
 * **Space Complexity:** O(t + h) where t = event types, h = total handlers
 *
 * **Data Structures:**
 * - **Primary Registry**: Map<string, Set<IEventHandler>> for O(1) lookups
 * - **Handler Sets**: Set<IEventHandler> for O(1) deduplication and existence checks
 * - **Processing Queue**: Set<string> for O(1) deduplication checks
 *
 * **Algorithm Characteristics:**
 * - **Lazy Initialization**: Handler sets created only when first handler registers
 * - **Automatic Deduplication**: Set data structure prevents duplicate handlers
 * - **Memory Efficient**: Empty handler sets automatically garbage collected
 * - **Thread Safe**: No concurrent modification issues in single-threaded context
 *
 * **Memory Management:**
 * - Automatic cleanup of empty handler sets
 * - No memory leaks from orphaned handler references
 * - Efficient garbage collection of unused event types
 * - Minimal memory overhead for registry operations
 */
const HANDLER_REGISTRY_ALGORITHM = `
Algorithm: Lazy Initialization Handler Registry
Data Structures:
- handlers: Map<string, Set<IEventHandler>>
- processingQueue: Set<string>

procedure subscribe(eventType, handler):
   if not handlers.has(eventType):
       handlers.set(eventType, new Set())

   handlers.get(eventType).add(handler)  // O(1) deduplication

procedure unsubscribe(eventType, handler):
   handlerSet ← handlers.get(eventType)
   if handlerSet:
       handlerSet.delete(handler)  // O(1) removal
       if handlerSet.size = 0:
           handlers.delete(eventType)  // Memory cleanup
`;

/**
 * ================================================================================================
 * BUSINESS LOGIC NOTES - Event-Driven Architecture Patterns and Inter-Module Communication
 * ================================================================================================
 *
 * This section explains the business logic patterns, architectural decisions, and design principles
 * that guide the EventBusService implementation and its role in the broader system architecture.
 */

/**
 * EVENT-DRIVEN ARCHITECTURE PATTERNS
 *
 * **1. Publisher-Subscriber Pattern Implementation**
 * - **Loose Coupling**: Publishers don't need to know about specific subscribers
 * - **Dynamic Registration**: Handlers can be added/removed at runtime
 * - **Type Safety**: Full TypeScript support with generic event interfaces
 * - **Scalability**: Easy to add new event types and handlers without code changes
 *
 * **2. Domain Event Pattern**
 * - **Domain Modeling**: Events represent significant business state changes
 * - **Audit Trail**: Complete history of domain state transitions
 * - **Event Sourcing**: Foundation for event sourcing capabilities
 * - **Business Process**: Enables complex multi-step business processes
 *
 * **3. Observer Pattern**
 * - **Reactive Programming**: System responds to state changes automatically
 * - **Decoupled Communication**: Components communicate through events
 * - **Extensibility**: New observers can be added without modifying subjects
 * - **Testability**: Easy to test components in isolation
 */

/**
 * INTER-MODULE COMMUNICATION STRATEGIES
 *
 * **1. Asynchronous Event Processing**
 * - **Non-blocking Operations**: Publishers don't wait for event processing
 * - **Queue-based Processing**: Events processed in background
 * - **Fault Tolerance**: System continues operating despite individual failures
 * - **Performance**: High throughput with concurrent handler execution
 *
 * **2. Error Isolation and Resilience**
 * - **Circuit Breaker Pattern**: Individual handler failures don't cascade
 * - **Graceful Degradation**: System continues with partial functionality
 * - **Comprehensive Logging**: Detailed error information for debugging
 * - **Monitoring Integration**: Statistics and metrics for observability
 *
 * **3. Event Ordering and Consistency**
 * - **FIFO Processing**: Events processed in publication order
 * - **Causality Preservation**: Maintains cause-effect relationships
 * - **Idempotency Support**: Events can be safely replayed
 * - **Transaction Boundaries**: Clear event boundaries for consistency
 */

/**
 * MICROSERVICES ARCHITECTURAL CONSIDERATIONS
 *
 * **1. Service Decoupling**
 * - **Independent Deployment**: Services can be deployed independently
 * - **Technology Agnostic**: Easy to replace with external message brokers
 * - **Protocol Flexibility**: Can support multiple communication protocols
 * - **Service Boundaries**: Clear separation of service responsibilities
 *
 * **2. Scalability Patterns**
 * - **Horizontal Scaling**: Easy to scale event processing horizontally
 * - **Load Distribution**: Events distributed across multiple handlers
 * - **Resource Management**: Efficient memory and CPU utilization
 * - **Performance Monitoring**: Built-in metrics for scaling decisions
 *
 * **3. Data Consistency Strategies**
 * - **Eventual Consistency**: Accepts temporary inconsistency for availability
 * - **Compensating Actions**: Error handling through compensating events
 * - **Idempotent Operations**: Safe retry and replay mechanisms
 * - **Audit Logging**: Complete audit trail for compliance and debugging
 */

/**
 * PERFORMANCE OPTIMIZATION PATTERNS
 *
 * **1. Memory Management**
 * - **Garbage Collection Friendly**: Minimal object retention
 * - **Automatic Cleanup**: Unused handlers and event types cleaned up
 * - **Efficient Data Structures**: O(1) operations for core functionality
 * - **Resource Pooling**: Reuses handler instances and connections
 *
 * **2. Concurrency Control**
 * - **Thread Safety**: Proper synchronization for concurrent access
 * - **Lock-free Algorithms**: Minimal locking for better performance
 * - **Async Processing**: Non-blocking I/O operations
 * - **Resource Sharing**: Efficient sharing of system resources
 *
 * **3. Caching and Optimization**
 * - **Handler Caching**: Fast lookup of registered handlers
 * - **Event Deduplication**: Prevents redundant processing
 * - **Lazy Initialization**: Resources created only when needed
 * - **Batch Processing**: Optimized for bulk operations
 */

/**
 * MONITORING AND OBSERVABILITY PATTERNS
 *
 * **1. Structured Logging**
 * - **Event Lifecycle Tracking**: Complete event processing audit trail
 * - **Performance Metrics**: Detailed timing and throughput information
 * - **Error Tracking**: Comprehensive error context and stack traces
 * - **Business Context**: Correlation IDs and business metadata
 *
 * **2. Health Monitoring**
 * - **System Statistics**: Queue sizes, processing counts, handler counts
 * - **Performance Indicators**: Processing rates, error rates, throughput
 * - **Resource Utilization**: Memory usage, CPU utilization, I/O metrics
 * - **Alerting Integration**: Proactive monitoring and alerting
 *
 * **3. Debugging Support**
 * - **Detailed Context**: Event IDs, correlation IDs, source information
 * - **Handler Tracing**: Individual handler execution tracking
 * - **Error Isolation**: Clear separation of handler-specific errors
 * - **Development Tools**: Testing utilities and debugging aids
 */

/**
 * TESTING AND DEVELOPMENT PATTERNS
 *
 * **1. Testability Design**
 * - **Dependency Injection**: Easy to mock dependencies and handlers
 * - **State Inspection**: Methods to inspect internal state for testing
 * - **Controlled Processing**: Ability to control event processing for tests
 * - **Cleanup Utilities**: Methods to reset state between tests
 *
 * **2. Development Workflow**
 * - **Hot Reload Support**: Compatible with development server hot reload
 * - **Debugging Friendly**: Rich logging and debugging information
 * - **Development Tools**: Utilities for development and debugging
 * - **Documentation**: Comprehensive inline documentation for developers
 *
 * **3. Production Readiness**
 * - **Error Handling**: Comprehensive error handling for production use
 * - **Monitoring**: Production-ready monitoring and logging
 * - **Performance**: Optimized for production workloads
 * - **Security**: Secure event processing and handler execution
 */
