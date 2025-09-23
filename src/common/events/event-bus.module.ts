import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

/**
 * Event Bus Module
 * Global module that provides event bus functionality across all modules
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
