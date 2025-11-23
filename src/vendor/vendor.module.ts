import { Module } from '@nestjs/common';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorStoreController } from './controllers/vendor-store.controller';
import { VendorStoreService } from './services/vendor-store.service';
import { VendorAuthModule } from './vendor-auth.module';
import { VendorOrderModule } from './vendor-order.module';
import { VendorPaymentModule } from './vendor-payment.module';
import { ProductModule } from '../product/product.module';
import { S3Service } from '../common/services/s3.service';
import { ImageProcessingService } from '../common/services/image-processing.service';

@Module({
  imports: [VendorAuthModule, VendorOrderModule, VendorPaymentModule, ProductModule],
  controllers: [
    VendorController,
    VendorStoreController,
  ],
  providers: [
    VendorService,
    VendorStoreService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [
    VendorService,
    VendorStoreService,
    S3Service,
    ImageProcessingService,
  ],
})
export class VendorModule {}
