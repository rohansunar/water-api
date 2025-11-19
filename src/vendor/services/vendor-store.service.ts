import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  CreateStoreDto,
  UpdateStoreDto,
  StoreResponseDto,
} from '../dto/vendor.dto';
import { VendorService } from './vendor.service';
import { Vendor } from '../interfaces/vendor.interface';

@Injectable()
export class VendorStoreService {
  private readonly logger = new Logger(VendorStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
    private readonly vendorService: VendorService,
  ) {}

  async createStore(
    vendor: Vendor,
    createStoreDto: CreateStoreDto,
  ): Promise<StoreResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const { name, address, phone, active_hours } = createStoreDto;

      // Log store creation attempt
      this.customLogger.logBusinessEvent(
        'store_creation_attempt',
        { vendorId: id, storeName: name },
        id,
      );

      // Check if vendor exists and is active (vendor object is already validated)
      if (!vendor.isActive) {
        this.customLogger.logBusinessEvent(
          'store_creation_failure',
          { vendorId: id, reason: 'vendor_not_active' },
          id,
        );
        throw new BadRequestException('Vendor is not active');
      }

      // Check if store name already exists for this vendor
      const existingStore = await this.prisma.vendorStore.findFirst({
        where: {
          vendorId: BigInt(id),
          name,
        },
      });

      if (existingStore) {
        this.customLogger.logBusinessEvent(
          'store_creation_failure',
          { vendorId: id, storeName: name, reason: 'store_name_exists' },
          id,
        );
        throw new ConflictException(
          `Store with name '${name}' already exists for vendor ${id}`,
        );
      }

      // Create store
      const store = await this.prisma.vendorStore.create({
        data: {
          vendorId: BigInt(id),
          name,
          address,
          phone,
          activeHours: active_hours || {},
          isActive: true,
        },
      });

      this.customLogger.logBusinessEvent(
        'store_created',
        { vendorId: id, storeId: store.id, storeName: name },
        id,
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
        { vendorId: id, error: error.message },
        id,
      );
      this.logger.error(`Store creation failed for vendor ${id}:`, error);
      throw new BadRequestException('Store creation failed');
    }
  }

  async getStores(
    vendor: Vendor,
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
  ): Promise<{
    stores: StoreResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;

      // Get stores with pagination
      const [stores, total] = await Promise.all([
        this.prisma.vendorStore.findMany({
          where: {
            vendorId: BigInt(id),
            ...(isActive !== undefined && { isActive }),
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.vendorStore.count({
          where: {
            vendorId: BigInt(id),
            ...(isActive !== undefined && { isActive }),
          },
        }),
      ]);

      this.customLogger.logBusinessEvent(
        'stores_retrieved',
        { vendorId: id, count: stores.length, page, limit },
        id,
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
        { vendorId: id, error: error.message },
        id,
      );
      this.logger.error(`Stores retrieval failed for vendor ${id}:`, error);
      throw new BadRequestException('Failed to retrieve stores');
    }
  }

  async getStoreById(
    vendor: Vendor,
    storeId: string,
  ): Promise<StoreResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const store = await this.prisma.vendorStore.findFirst({
        where: {
          id: BigInt(storeId),
          vendorId: BigInt(id),
        },
      });

      if (!store) {
        this.customLogger.logBusinessEvent(
          'store_retrieval_failure',
          { vendorId: id, storeId, reason: 'store_not_found' },
          id,
        );
        throw new NotFoundException('Store not found');
      }

      this.customLogger.logBusinessEvent(
        'store_retrieved',
        { vendorId: id, storeId },
        id,
      );

      return this.mapToResponseDto(store);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_retrieval_error',
        { vendorId: id, storeId, error: error.message },
        id,
      );
      this.logger.error(
        `Store retrieval failed for vendor ${id}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve store');
    }
  }

  async updateStore(
    vendor: Vendor,
    storeId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      const { name, address, phone, active_hours, is_active } = updateStoreDto;

      // Check if store exists and belongs to vendor
      const existingStore = await this.prisma.vendorStore.findFirst({
        where: {
          id: BigInt(storeId),
          vendorId: BigInt(id),
        },
      });

      if (!existingStore) {
        this.customLogger.logBusinessEvent(
          'store_update_failure',
          { vendorId: id, storeId, reason: 'store_not_found' },
          id,
        );
        throw new NotFoundException('Store not found');
      }

      // Check if new name conflicts with existing stores
      if (name && name !== existingStore.name) {
        const nameConflict = await this.prisma.vendorStore.findFirst({
          where: {
            vendorId: BigInt(id),
            name,
            id: { not: BigInt(storeId) },
          },
        });

        if (nameConflict) {
          this.customLogger.logBusinessEvent(
            'store_update_failure',
            { vendorId: id, storeId, reason: 'name_conflict' },
            id,
          );
          throw new ConflictException(
            `Store with name '${name}' already exists for vendor ${id}`,
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

      const updatedStore = await this.prisma.vendorStore.update({
        where: { id: BigInt(storeId) },
        data: updateData,
      });

      this.customLogger.logBusinessEvent(
        'store_updated',
        { vendorId: id, storeId, storeName: updatedStore.name },
        id,
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
        { vendorId: id, storeId, error: error.message },
        id,
      );
      this.logger.error(
        `Store update failed for vendor ${id}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Store update failed');
    }
  }

  async deleteStore(vendor: Vendor, storeId: string): Promise<void> {
    const { id } = vendor;
    const startTime = Date.now();
    try {
      // Check if store exists and belongs to vendor
      const existingStore = await this.prisma.vendorStore.findFirst({
        where: {
          id: BigInt(storeId),
          vendorId: BigInt(id),
        },
      });

      if (!existingStore) {
        this.customLogger.logBusinessEvent(
          'store_deletion_failure',
          { vendorId: id, storeId, reason: 'store_not_found' },
          id,
        );
        throw new NotFoundException('Store not found');
      }

      // Soft delete by setting isActive to false
      await this.prisma.vendorStore.update({
        where: { id: BigInt(storeId) },
        data: { isActive: false },
      });

      this.customLogger.logBusinessEvent(
        'store_deleted',
        { vendorId: id, storeId, storeName: existingStore.name },
        id,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.customLogger.logBusinessEvent(
        'store_deletion_error',
        { vendorId: id, storeId, error: error.message },
        id,
      );
      this.logger.error(
        `Store deletion failed for vendor ${id}, store ${storeId}:`,
        error,
      );
      throw new BadRequestException('Store deletion failed');
    }
  }

  private mapToResponseDto(store: any): StoreResponseDto {
    return {
      id: store.id.toString(),
      vendor_id: store.vendorId.toString(),
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
