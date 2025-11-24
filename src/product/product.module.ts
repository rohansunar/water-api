import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { ProductModerationService } from './services/product-moderation.service';
import { VendorJwtAuthGuard } from './guards/vendor-jwt-auth.guard';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductModerationService,
    VendorJwtAuthGuard,
    ImageProcessingService,
    S3Service,
  ],
  exports: [ProductService, ProductModerationService, VendorJwtAuthGuard],
})
export class ProductModule {}
