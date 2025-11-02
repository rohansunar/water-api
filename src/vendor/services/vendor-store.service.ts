import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VendorStore,
  VendorStoreDocument,
} from '../../common/schemas/vendor-store.schema';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  CreateStoreDto,
  UpdateStoreDto,
  StoreResponseDto,
} from '../dto/vendor.dto';
import { VendorService } from './vendor.service';

@Injectable()
export class VendorStoreService {
  private readonly logger = new Logger(VendorStoreService.name);

  constructor(
    @InjectModel(VendorStore.name)
    private storeModel: Model<VendorStoreDocument>,
    private readonly customLogger: CustomLoggerService,
    private readonly vendorService: VendorService,
  ) {}

  async createStore(
    vendorId: string,
    createStoreDto: CreateStoreDto,
  ): Promise<StoreResponseDto> {
    const startTime = Date.now();
    try {
      const { name, address, phone, active_hours } = createStoreDto;

      // Log store creation attempt
      this.customLogger.logBusinessEvent(
        'store_creation_attempt',
        { vendorId, storeName: name },
        vendorId,
      );

      // Check if vendor exists and is active
      const vendor = await this.vendorService.findById(vendorId);
      if (!vendor) {
        this.customLogger.logBusinessEvent(
          'store_creation_failure',
          { vendorId, reason: 'vendor_not_found' },
          vendorId,
        );
        throw new NotFoundException('Vendor not found');
      }

      // Check if store name already exists for this vendor
      const existingStore = await this.storeModel.findOne({
        vendorId,
        name,
      });

      if (existingStore) {
        this.customLogger.logBusinessEvent(
          'store_creation_failure',
          { vendorId, storeName: name, reason: 'store_name_exists' },
          vendorId,
        );
        throw new ConflictException(
          'Store with this name already exists for this vendor',
        );
      }

      // Create store
      const store = await this.storeModel.create({
        vendorId,
        name,
        address,
        phone,
        activeHours: active_hours || {},
        isActive: true,
      });

      this.customLogger.logBusinessEvent(
        'store_created',
        { vendorId, storeId: store.id, storeName: name },
        vendorId,
      );

      return this.mapToResponseDto(store);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_creation_error',
        { vendorId, error: error.message },
        vendorId,
      );
      this.logger.error(`Store creation failed for vendor ${vendorId}:`, error);
      throw new BadRequestException('Store creation failed');
    }
  }

  async getStores(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
  ): Promise<{
    stores: StoreResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Build filter condition
      const filter: any = { vendorId };
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Get stores with pagination
      const [stores, total] = await Promise.all([
        this.storeModel
          .find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.storeModel.countDocuments(filter).exec(),
      ]);

      this.customLogger.logBusinessEvent(
        'stores_retrieved',
        { vendorId, count: stores.length, page, limit },
        vendorId,
      );

      return {
        stores: stores.map((store) => this.mapToResponseDto(store)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.customLogger.logBusinessEvent(
        'stores_retrieval_error',
        { vendorId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Stores retrieval failed for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve stores');
    }
  }

  async getStoreById(
    vendorId: string,
    storeId: string,
  ): Promise<StoreResponseDto> {
    const startTime = Date.now();
    try {
      const store = await this.storeModel.findOne({
        _id: storeId,
        vendorId,
      });

      if (!store) {
        this.customLogger.logBusinessEvent(
          'store_retrieval_failure',
          { vendorId, storeId, reason: 'store_not_found' },
          vendorId,
        );
        throw new NotFoundException('Store not found');
      }

      this.customLogger.logBusinessEvent(
        'store_retrieved',
        { vendorId, storeId },
        vendorId,
      );

      return this.mapToResponseDto(store);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_retrieval_error',
        { vendorId, storeId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Store retrieval failed for vendor ${vendorId}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve store');
    }
  }

  async updateStore(
    vendorId: string,
    storeId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const startTime = Date.now();
    try {
      const { name, address, phone, active_hours, is_active } = updateStoreDto;

      // Check if store exists and belongs to vendor
      const existingStore = await this.storeModel.findOne({
        _id: storeId,
        vendorId,
      });

      if (!existingStore) {
        this.customLogger.logBusinessEvent(
          'store_update_failure',
          { vendorId, storeId, reason: 'store_not_found' },
          vendorId,
        );
        throw new NotFoundException('Store not found');
      }

      // Check if new name conflicts with existing stores
      if (name && name !== existingStore.name) {
        const nameConflict = await this.storeModel.findOne({
          vendorId,
          name,
          _id: { $ne: storeId },
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'store_update_failure',
            { vendorId, storeId, reason: 'name_conflict' },
            vendorId,
          );
          throw new ConflictException(
            'Store with this name already exists for this vendor',
          );
        }
      }

      // Update store
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      if (active_hours !== undefined) updateData.activeHours = active_hours;
      if (is_active !== undefined) updateData.isActive = is_active;

      const updatedStore = await this.storeModel
        .findByIdAndUpdate(storeId, updateData, { new: true })
        .exec();

      this.customLogger.logBusinessEvent(
        'store_updated',
        { vendorId, storeId, storeName: updatedStore.name },
        vendorId,
      );

      return this.mapToResponseDto(updatedStore);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_update_error',
        { vendorId, storeId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Store update failed for vendor ${vendorId}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Store update failed');
    }
  }

  async deleteStore(vendorId: string, storeId: string): Promise<void> {
    const startTime = Date.now();
    try {
      // Check if store exists and belongs to vendor
      const existingStore = await this.storeModel.findOne({
        _id: storeId,
        vendorId,
      });

      if (!existingStore) {
        this.customLogger.logBusinessEvent(
          'store_deletion_failure',
          { vendorId, storeId, reason: 'store_not_found' },
          vendorId,
        );
        throw new NotFoundException('Store not found');
      }

      // Soft delete by setting is_active to false
      await this.storeModel
        .findByIdAndUpdate(storeId, { isActive: false })
        .exec();

      this.customLogger.logBusinessEvent(
        'store_deleted',
        { vendorId, storeId, storeName: existingStore.name },
        vendorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_deletion_error',
        { vendorId, storeId, error: error.message },
        vendorId,
      );
      this.logger.error(
        `Store deletion failed for vendor ${vendorId}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Store deletion failed');
    }
  }

  private mapToResponseDto(store: VendorStoreDocument): StoreResponseDto {
    return {
      id: store._id.toString(),
      vendor_id: store.vendorId,
      name: store.name,
      address: store.address || '',
      phone: store.phone,
      active_hours: store.activeHours,
      is_active: store.isActive,
      created_at: store.createdAt,
      updated_at: store.updatedAt,
    };
  }
}
