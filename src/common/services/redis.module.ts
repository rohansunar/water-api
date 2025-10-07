import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis Module
 * Global module that provides Redis functionality across all modules
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
