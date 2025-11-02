import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorController } from './controllers/vendor.controller';
import { VendorService } from './services/vendor.service';
import { VendorStoreController } from './controllers/vendor-store.controller';
import { VendorStoreService } from './services/vendor-store.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { VendorProductService } from './services/vendor-product.service';
import { VendorAuthModule } from './vendor-auth.module';
import {
  VendorStore,
  VendorStoreSchema,
} from '../common/schemas/vendor-store.schema';
import { Product, ProductSchema } from '../common/schemas/product.schema';

@Module({
  imports: [
    VendorAuthModule,
    MongooseModule.forFeature([
      { name: VendorStore.name, schema: VendorStoreSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
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
