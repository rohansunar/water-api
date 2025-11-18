import { Module } from '@nestjs/common';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorStoreController } from './controllers/vendor-store.controller';
import { VendorStoreService } from './services/vendor-store.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { VendorProductService } from './services/vendor-product.service';
import { VendorAuthModule } from './vendor-auth.module';
import { VendorOrderModule } from './vendor-order.module';
import { VendorPaymentModule } from './vendor-payment.module';

@Module({
  imports: [
    VendorAuthModule,
    VendorOrderModule,
    VendorPaymentModule,
  ],
  controllers: [
    VendorController,
    VendorStoreController,
    VendorProductController,
  ],
  providers: [VendorService, VendorStoreService, VendorProductService],
  exports: [VendorService, VendorStoreService, VendorProductService],
})
export class VendorModule {}
