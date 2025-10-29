import { Module } from '@nestjs/common';
import { ProductModerationService } from './services/product-moderation.service';

@Module({
  providers: [ProductModerationService],
  exports: [ProductModerationService],
})
export class ProductModerationModule {}
