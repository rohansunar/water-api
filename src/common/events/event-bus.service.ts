import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IEvent, IEventBus, IEventHandler } from './event-bus.interface';

/**
 * In-Memory Event Bus Service
 * Handles inter-module communication through events
 * Microservices-ready: Can be easily replaced with external message broker
 */
@Injectable()
export class EventBusService implements IEventBus, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, Set<IEventHandler>>();
  private readonly eventQueue: IEvent[] = [];
  private readonly processingQueue = new Set<string>();
  private isProcessing = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleDestroy() {
    this.handlers.clear();
    this.eventQueue.length = 0;
    this.processingQueue.clear();
    this.logger.log('Event bus cleaned up');
  }

  /**
   * Publish a single event
   */
  async publish<T extends IEvent>(event: T): Promise<void> {
    try {
      this.logger.debug(`Publishing event: ${event.eventType}`, {
        eventId: event.eventId,
        source: event.source,
        correlationId: event.correlationId,
      });

      // Add to queue for processing
      this.eventQueue.push(event);

      // Process queue if not already processing
      if (!this.isProcessing) {
        await this.processEventQueue();
      }
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, {
        error: error.message,
        eventId: event.eventId,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Publish multiple events
   */
  async publishMany<T extends IEvent>(events: T[]): Promise<void> {
    try {
      this.logger.debug(`Publishing ${events.length} events`);

      // Add all events to queue
      this.eventQueue.push(...events);

      // Process queue if not already processing
      if (!this.isProcessing) {
        await this.processEventQueue();
      }
    } catch (error) {
      this.logger.error('Failed to publish multiple events', {
        error: error.message,
        eventCount: events.length,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType).add(handler);

    this.logger.debug(`Subscribed handler to event: ${eventType}`, {
      handlerName: handler.constructor.name,
      totalHandlers: this.handlers.get(eventType).size,
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: IEventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);

      // Clean up empty handler sets
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
      }

      this.logger.debug(`Unsubscribed handler from event: ${eventType}`, {
        handlerName: handler.constructor.name,
      });
    }
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error('Error processing event queue', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: IEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType);

    if (!eventHandlers || eventHandlers.size === 0) {
      this.logger.debug(`No handlers found for event: ${event.eventType}`, {
        eventId: event.eventId,
      });
      return;
    }

    // Prevent duplicate processing
    if (this.processingQueue.has(event.eventId)) {
      this.logger.warn(`Event already being processed: ${event.eventId}`);
      return;
    }

    this.processingQueue.add(event.eventId);

    try {
      const handlerPromises = Array.from(eventHandlers).map(async (handler) => {
        try {
          await handler.handle(event);
          this.logger.debug(`Handler processed event successfully`, {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: handler.constructor.name,
          });
        } catch (error) {
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

      await Promise.all(handlerPromises);

      this.logger.debug(`Event processed by all handlers`, {
        eventType: event.eventType,
        eventId: event.eventId,
        handlerCount: eventHandlers.size,
      });
    } finally {
      this.processingQueue.delete(event.eventId);
    }
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEventTypes: number;
    totalHandlers: number;
    queueSize: number;
    processingCount: number;
  } {
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
   * Clear all handlers (for testing)
   */
  clearHandlers(): void {
    this.handlers.clear();
    this.logger.debug('All event handlers cleared');
  }
}
