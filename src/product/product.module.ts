import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { VendorModule } from '../vendor/vendor.module';
import { ProductModerationModule } from './product-moderation.module';

@Module({
  imports: [
    VendorModule,
    ProductModerationModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
