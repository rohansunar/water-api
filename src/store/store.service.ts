import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorStore, VendorStoreDocument } from '../common/schemas/vendor-store.schema';
import { CustomLoggerService } from '../common/logger/logger.service';

@Injectable()
export class StoreService {
  constructor(
    @InjectModel(VendorStore.name) private storeModel: Model<VendorStoreDocument>,
    private readonly logger: CustomLoggerService,
  ) {}

  async getStoreDetails(storeId: string): Promise<any> {
    try {
      const store = await this.storeModel.findById(storeId).exec();

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // Transform to match API spec
      return {
        id: (store as any).id,
        vendor_id: (store.vendorId as any).toString(),
        name: store.name,
        address: {
          line1: 'Default Address', // TODO: Get from addressId
          city: 'Default City',
          pincode: '734001',
        },
        phone: store.phone,
        rating: store.rating,
        is_verified: true, // TODO: Add verification logic
        active_hours: store.activeHours,
      };
    } catch (error) {
      this.logger.error(`Error getting store details for ${storeId}:`, error);
      throw error;
    }
  }
}
