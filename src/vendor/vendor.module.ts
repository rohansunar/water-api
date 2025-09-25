import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorStoreController } from './vendor-store.controller';
import { VendorStoreService } from './vendor-store.service';
import { VendorProductController } from './vendor-product.controller';
import { VendorProductService } from './vendor-product.service';
import { VendorAuthModule } from './vendor-auth.module';
import {
  VendorStore,
  VendorStoreSchema,
} from '../common/schemas/vendor-store.schema';
import {
  Product,
  ProductSchema,
} from '../common/schemas/product.schema';

@Module({
  imports: [
    VendorAuthModule,
    MongooseModule.forFeature([
      { name: VendorStore.name, schema: VendorStoreSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [VendorController, VendorStoreController, VendorProductController],
  providers: [VendorService, VendorStoreService, VendorProductService],
  exports: [VendorService, VendorStoreService, VendorProductService],
})
export class VendorModule {}
