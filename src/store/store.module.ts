import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { VendorStore, VendorStoreSchema } from '../common/schemas/vendor-store.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorStore.name, schema: VendorStoreSchema },
    ]),
  ],
  controllers: [StoreController],
  providers: [StoreService]
})
export class StoreModule {}
