import { Module } from '@nestjs/common';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorStoreController } from './controllers/vendor-store.controller';
import { VendorStoreService } from './services/vendor-store.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { VendorProductService } from './services/vendor-product.service';
import { VendorAuthModule } from './vendor-auth.module';

@Module({
  imports: [
    VendorAuthModule,
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
