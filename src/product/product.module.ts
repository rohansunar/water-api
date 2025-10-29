import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { Product, ProductSchema } from '../common/schemas/product.schema';
import {
  VendorStore,
  VendorStoreSchema,
} from '../common/schemas/vendor-store.schema';
import { VendorModule } from '../vendor/vendor.module';
import { ProductModerationModule } from './product-moderation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: VendorStore.name, schema: VendorStoreSchema },
    ]),
    VendorModule,
    ProductModerationModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
