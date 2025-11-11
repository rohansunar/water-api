import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {}

  async getStoreDetails(storeId: string): Promise<any> {
    try {
      const store = await this.prisma.vendorStore.findUnique({
        where: { id: BigInt(storeId) },
        include: {
          vendor: true, // Include vendor relation for vendor_id
        },
      });

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // Transform to match API spec
      return {
        id: store.id.toString(),
        vendor_id: store.vendorId.toString(),
        name: store.name,
        address: {
          line1: 'Default Address', // TODO: Get from addressId
          city: 'Default City',
          pincode: '734001',
        },
        phone: store.phone,
        rating: Number(store.rating),
        is_verified: true, // TODO: Add verification logic
        active_hours: store.activeHours,
      };
    } catch (error) {
      this.logger.error(`Error getting store details for ${storeId}:`, error);
      throw error;
    }
  }
}
