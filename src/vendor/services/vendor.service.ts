import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Vendor,
  DeliveryZone,
  DayOfWeek,
} from '../interfaces/vendor.interface';
import {
  CreateProductDto,
  ProductResponseDto,
} from '../../product/dto/product.dto';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../order/dto/order.dto';
import {
  UpdateStoreDto,
  StoreResponseDto,
  CreateStoreHoursDto,
  UpdateStoreHoursDto,
  StoreHoursResponseDto,
  UpdateStoreStatusDto,
  SalesAnalyticsDto,
  SalesAnalyticsResponseDto,
  ProductPerformanceDto,
  CustomerInsightsDto,
  DailyReportDto,
  MonthlyReportDto,
  InventoryStatusDto,
  UpdateInventoryDto,
  InventoryAdjustmentDto,
  LowStockAlertDto,
  OrderSummaryDto,
  AcceptOrderDto,
  RejectOrderDto,
  PaginationQueryDto,
  PaginatedResponseDto,
  VendorProductVariantResponseDto,
} from '../dto/vendor.dto';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Vendor | null> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: BigInt(id) },
        include: {
          stores: true,
          addresses: true,
        },
      });

      if (!vendor) return null;

      return this.mapPrismaVendorToInterface(vendor);
    } catch (error) {
      this.logger.error(`Error finding vendor by ID ${id}:`, error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Vendor | null> {
    try {
      // For now, we'll assume userId maps to vendor phone or email
      // In a real implementation, you'd have a separate user-vendor mapping table
      const vendor = await this.prisma.vendor.findFirst({
        where: {
          OR: [{ phone: userId }, { email: userId }],
        },
        include: {
          stores: true,
          addresses: true,
        },
      });

      if (!vendor) return null;

      return this.mapPrismaVendorToInterface(vendor);
    } catch (error) {
      this.logger.error(`Error finding vendor by userId ${userId}:`, error);
      return null;
    }
  }

  async findByLocation(lat: number, lng: number): Promise<Vendor[]> {
    try {
      // For now, we'll find vendors who have products with areaPincodes
      // In a real implementation, you'd determine the pincode from lat/lng
      // and filter vendors whose products serve that pincode
      const vendors = await this.prisma.vendor.findMany({
        where: {
          isActive: true,
          products: {
            some: {
              areaPincodes: {
                isEmpty: false, // Has at least one pincode
              },
            },
          },
        },
        include: {
          stores: true,
          addresses: true,
          products: {
            where: {
              areaPincodes: {
                isEmpty: false,
              },
            },
          },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      });

      return vendors.map((vendor) => this.mapPrismaVendorToInterface(vendor));
    } catch (error) {
      this.logger.error(
        `Error finding vendors by location (${lat}, ${lng}):`,
        error,
      );
      return [];
    }
  }

  async getAllVendors(): Promise<Vendor[]> {
    try {
      const vendors = await this.prisma.vendor.findMany({
        where: { isActive: true },
        include: {
          stores: true,
          addresses: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return vendors.map((vendor) => this.mapPrismaVendorToInterface(vendor));
    } catch (error) {
      this.logger.error('Error finding all vendors:', error);
      throw error;
    }
  }

  async create(userId: string, businessName: string): Promise<Vendor> {
    try {
      const vendor = await this.prisma.vendor.create({
        data: {
          name: businessName,
          phone: userId, // Assuming userId is phone for now
          kycStatus: 'pending',
          isActive: true,
        },
        include: {
          stores: true,
          addresses: true,
        },
      });

      this.logger.log(`Created vendor: ${vendor.id} for user: ${userId}`);
      return this.mapPrismaVendorToInterface(vendor);
    } catch (error) {
      this.logger.error(`Error creating vendor for user ${userId}:`, error);
      throw error;
    }
  }

  async addDeliveryZone(
    vendorId: string,
    zoneName: string,
    pincodes: string[],
    deliveryFee: number,
  ): Promise<DeliveryZone> {
    try {
      // Find vendor
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: BigInt(vendorId) },
        include: { products: true },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      // Update areaPincodes for all products of this vendor
      await this.prisma.product.updateMany({
        where: { vendorId: BigInt(vendorId) },
        data: {
          areaPincodes: {
            push: pincodes,
          },
        },
      });

      // Also update ProductStoreMapping if stores exist
      const stores = await this.prisma.store.findMany({
        where: { vendorId: BigInt(vendorId) },
      });

      for (const store of stores) {
        await this.prisma.productStoreMapping.updateMany({
          where: { storeId: store.id },
          data: {
            areaPincodes: {
              push: pincodes,
            },
          },
        });
      }

      // Create a delivery zone object for interface compatibility
      const zone: DeliveryZone = {
        id: uuidv4(),
        vendorId,
        name: zoneName,
        coordinates: [], // Empty since we're using pincodes
        deliveryFee,
        minOrderAmount: 50,
        maxDeliveryTime: 60, // 1 hour
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(
        `Added delivery zone ${zone.id} to vendor ${vendorId} with pincodes: ${pincodes.join(', ')}`,
      );
      return zone;
    } catch (error) {
      this.logger.error(
        `Error adding delivery zone to vendor ${vendorId}:`,
        error,
      );
      throw error;
    }
  }

  private isPointInDeliveryZone(
    lat: number,
    lng: number,
    zone: DeliveryZone,
  ): boolean {
    // Simple distance-based check (within 5km radius)
    // In production, you'd use proper polygon containment or more sophisticated geo queries
    if (zone.coordinates.length === 0) return false;

    const centerLat =
      zone.coordinates.reduce((sum, coord) => sum + coord.latitude, 0) /
      zone.coordinates.length;
    const centerLng =
      zone.coordinates.reduce((sum, coord) => sum + coord.longitude, 0) /
      zone.coordinates.length;

    const distance = this.calculateDistance(lat, lng, centerLat, centerLng);
    return distance <= 5; // 5km radius
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Vendor Dashboard Methods
  async getVendorOrders(vendor: Vendor): Promise<OrderResponseDto[]> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          vendorId: BigInt(vendor.id),
        },
        include: {
          customer: true,
          address: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return orders.map((order) => this.mapOrderToOrderResponseDto(order));
    } catch (error) {
      this.logger.error(
        `Error fetching vendor orders for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch vendor orders');
    }
  }

  async updateOrderStatus(
    orderId: string,
    vendor: Vendor,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    try {
      // First, find the order to ensure it belongs to this vendor
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          orderUuid: orderId,
          vendorId: BigInt(vendor.id),
        },
        include: {
          customer: true,
          address: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new NotFoundException(
          'Order not found or does not belong to this vendor',
        );
      }

      // Update the order status
      const updatedOrder = await this.prisma.order.update({
        where: {
          id_createdAt: {
            id: existingOrder.id,
            createdAt: existingOrder.createdAt,
          },
        },
        data: {
          status: updateOrderStatusDto.status,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          address: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.log(
        `Updated order ${orderId} status to ${updateOrderStatusDto.status} for vendor ${vendor.id}`,
      );

      return this.mapOrderToOrderResponseDto(updatedOrder);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating order status for order ${orderId}:`,
        error,
      );
      throw new BadRequestException('Failed to update order status');
    }
  }

  async getVendorProducts(userId: string): Promise<ProductResponseDto[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const products = await this.prisma.product.findMany({
        where: {
          vendorId: BigInt(vendor.id),
          isActive: true,
        },
        include: {
          storeMappings: {
            include: {
              store: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return products.map((product) =>
        this.mapProductToProductResponseDto(product, vendor),
      );
    } catch (error) {
      this.logger.error(
        `Error fetching products for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch vendor products');
    }
  }

  async createProduct(
    userId: string,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          vendorId: BigInt(vendor.id),
          name: createProductDto.name,
          description: createProductDto.description,
          category: createProductDto.category,
          capacity: createProductDto.size, // Using size as capacity
          unit: 'liter', // Default unit
          price: createProductDto.price,
          depositAmount: createProductDto.depositAmount,
          hasDeposit: createProductDto.hasDeposit,
          stockQuantity: createProductDto.stockQuantity,
          images: createProductDto.images || [],
          specifications: {
            capacity: this.getSizeCapacity(createProductDto.size),
            material: 'Plastic',
            brand: 'Generic',
          },
          isActive: true,
        },
        include: {
          storeMappings: {
            include: {
              store: true,
            },
          },
        },
      });

      this.logger.log(`Created product ${product.id} for vendor ${vendor.id}`);
      return this.mapProductToProductResponseDto(product, vendor);
    } catch (error) {
      this.logger.error(
        `Error creating product for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to create product');
    }
  }

  async updateProductStock(
    productId: string,
    userId: string,
    quantity: number,
  ): Promise<ProductResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const updatedProduct = await this.prisma.product.update({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendor.id), // Ensure product belongs to vendor
        },
        data: {
          stockQuantity: Math.max(0, quantity), // Ensure non-negative stock
          updatedAt: new Date(),
        },
        include: {
          storeMappings: {
            include: {
              store: true,
            },
          },
        },
      });

      this.logger.log(`Updated stock for product ${productId} to ${quantity}`);
      return this.mapProductToProductResponseDto(updatedProduct, vendor);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Product not found or does not belong to this vendor',
        );
      }
      this.logger.error(
        `Error updating stock for product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to update product stock');
    }
  }

  private getSizeCapacity(size: string): number {
    switch (size) {
      case '10L':
        return 10;
      case '20L':
        return 20;
      case '25L':
        return 25;
      case '30L':
        return 30;
      default:
        return 20;
    }
  }

  // Store Management Methods
  async getStoreDetails(userId: string): Promise<StoreResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      return {
        id: store.id.toString(),
        vendor_id: vendor.id,
        name: store.name,
        address: store.address || '',
        phone: store.phone || undefined,
        active_hours:
          (store.activeHours as Record<
            string,
            { open: string; close: string }
          >) || {},
        is_active: store.isActive,
        created_at: store.createdAt,
        updated_at: store.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching store details for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch store details');
    }
  }

  async updateStore(
    userId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updateStoreDto.name !== undefined)
        updateData.name = updateStoreDto.name;
      if (updateStoreDto.address !== undefined)
        updateData.address = updateStoreDto.address;
      if (updateStoreDto.phone !== undefined)
        updateData.phone = updateStoreDto.phone;
      if (updateStoreDto.active_hours !== undefined)
        updateData.activeHours = updateStoreDto.active_hours;
      if (updateStoreDto.is_active !== undefined)
        updateData.isActive = updateStoreDto.is_active;

      const updatedStore = await this.prisma.store.update({
        where: { id: store.id },
        data: updateData,
      });

      this.logger.log(`Updated store ${store.id} for vendor ${vendor.id}`);

      return {
        id: updatedStore.id.toString(),
        vendor_id: vendor.id,
        name: updatedStore.name,
        address: updatedStore.address || '',
        phone: updatedStore.phone || undefined,
        active_hours:
          (updatedStore.activeHours as Record<
            string,
            { open: string; close: string }
          >) || {},
        is_active: updatedStore.isActive,
        created_at: updatedStore.createdAt,
        updated_at: updatedStore.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating store for vendor ${vendor.id}:`, error);
      throw new BadRequestException('Failed to update store');
    }
  }

  async createStoreHours(
    userId: string,
    createStoreHoursDto: CreateStoreHoursDto,
  ): Promise<StoreHoursResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      // Get current activeHours
      const currentHours =
        (store.activeHours as Record<
          string,
          { open: string; close: string; isClosed?: boolean }
        >) || {};

      // Update or add the day
      if (createStoreHoursDto.isClosed) {
        currentHours[createStoreHoursDto.day] = {
          open: '00:00',
          close: '00:00',
          isClosed: true,
        };
      } else {
        currentHours[createStoreHoursDto.day] = {
          open: createStoreHoursDto.openTime,
          close: createStoreHoursDto.closeTime,
        };
      }

      // Update the store
      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          activeHours: currentHours,
          updatedAt: new Date(),
        },
      });

      const storeHours: StoreHoursResponseDto = {
        id: createStoreHoursDto.day, // Use day as ID since we don't have separate records
        storeId: store.id.toString(),
        day: createStoreHoursDto.day,
        openTime: createStoreHoursDto.openTime,
        closeTime: createStoreHoursDto.closeTime,
        isClosed: createStoreHoursDto.isClosed,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(
        `Created store hours for ${createStoreHoursDto.day} for vendor ${vendor.id}`,
      );
      return storeHours;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error creating store hours for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to create store hours');
    }
  }

  async updateStoreHours(
    hoursId: string,
    userId: string,
    updateStoreHoursDto: UpdateStoreHoursDto,
  ): Promise<StoreHoursResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      // Get current activeHours
      const currentHours =
        (store.activeHours as Record<
          string,
          { open: string; close: string; isClosed?: boolean }
        >) || {};

      // Check if the day exists
      if (!currentHours[hoursId]) {
        throw new NotFoundException(`Store hours for ${hoursId} not found`);
      }

      // Update the day
      if (
        updateStoreHoursDto.isClosed !== undefined &&
        updateStoreHoursDto.isClosed
      ) {
        currentHours[hoursId] = {
          open: '00:00',
          close: '00:00',
          isClosed: true,
        };
      } else {
        currentHours[hoursId] = {
          open: updateStoreHoursDto.openTime || currentHours[hoursId].open,
          close: updateStoreHoursDto.closeTime || currentHours[hoursId].close,
          isClosed:
            updateStoreHoursDto.isClosed ??
            currentHours[hoursId].isClosed ??
            false,
        };
      }

      // Update the store
      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          activeHours: currentHours,
          updatedAt: new Date(),
        },
      });

      const updatedHours: StoreHoursResponseDto = {
        id: hoursId,
        storeId: store.id.toString(),
        day: hoursId,
        openTime: currentHours[hoursId].open,
        closeTime: currentHours[hoursId].close,
        isClosed: currentHours[hoursId].isClosed ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(
        `Updated store hours for ${hoursId} for vendor ${vendor.id}`,
      );
      return updatedHours;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating store hours ${hoursId} for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to update store hours');
    }
  }

  async deleteStoreHours(
    hoursId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      // Get current activeHours
      const currentHours =
        (store.activeHours as Record<
          string,
          { open: string; close: string; isClosed?: boolean }
        >) || {};

      // Check if the day exists
      if (!currentHours[hoursId]) {
        throw new NotFoundException(`Store hours for ${hoursId} not found`);
      }

      // Remove the day
      delete currentHours[hoursId];

      // Update the store
      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          activeHours: currentHours,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Deleted store hours for ${hoursId} for vendor ${vendor.id}`,
      );
      return { message: 'Store hours deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting store hours ${hoursId} for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to delete store hours');
    }
  }

  async updateStoreStatus(
    userId: string,
    updateStoreStatusDto: UpdateStoreStatusDto,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const store = await this.prisma.store.findFirst({
        where: { vendorId: BigInt(vendor.id) },
      });

      if (!store) {
        throw new NotFoundException('Store not found for this vendor');
      }

      // Map status to isActive
      const isActive = updateStoreStatusDto.status === 'open';

      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          isActive,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Updated store status to ${updateStoreStatusDto.status} for vendor ${vendor.id}`,
      );

      return {
        message: `Store status updated to ${updateStoreStatusDto.status}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating store status for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to update store status');
    }
  }

  // Product Management Methods
  async getProductVariants(
    productId: string,
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<VendorProductVariantResponseDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // First, get the base product to determine variant pattern
      const baseProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendor.id),
        },
      });

      if (!baseProduct) {
        throw new NotFoundException('Base product not found');
      }

      // Find variants: products that start with base product name + " - "
      const variantPrefix = `${baseProduct.name} - `;

      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      const [variants, total] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            vendorId: BigInt(vendor.id),
            name: {
              startsWith: variantPrefix,
            },
            isActive: true,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.product.count({
          where: {
            vendorId: BigInt(vendor.id),
            name: {
              startsWith: variantPrefix,
            },
            isActive: true,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const variantDtos = variants.map((variant) => ({
        id: variant.id.toString(),
        product_id: productId,
        variant_sku: `VAR-${variant.id}`, // Generate SKU
        attributes: (variant.specifications as Record<string, any>) || {},
        price_override: Number(variant.price),
        is_active: variant.isActive,
        created_at: variant.createdAt,
        updated_at: variant.updatedAt,
      }));

      return {
        data: variantDtos,
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching variants for product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch product variants');
    }
  }

  async createProductVariant(
    productId: string,
    userId: string,
    createVariantDto: any,
  ): Promise<VendorProductVariantResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Get the base product
      const baseProduct = await this.prisma.product.findFirst({
        where: {
          id: BigInt(productId),
          vendorId: BigInt(vendor.id),
        },
      });

      if (!baseProduct) {
        throw new NotFoundException('Base product not found');
      }

      // Create variant name: base name + " - " + variant type
      const variantType = createVariantDto.attributes?.type || 'variant';
      const variantName = `${baseProduct.name} - ${variantType}`;

      const variant = await this.prisma.product.create({
        data: {
          vendorId: BigInt(vendor.id),
          name: variantName,
          description: baseProduct.description,
          category: baseProduct.category,
          capacity: baseProduct.capacity,
          unit: baseProduct.unit,
          price: createVariantDto.priceOverride || baseProduct.price,
          depositAmount: baseProduct.depositAmount,
          hasDeposit: baseProduct.hasDeposit,
          stockQuantity: 0, // Variants start with 0 stock
          images: baseProduct.images,
          specifications: {
            ...((baseProduct.specifications as Record<string, any>) || {}),
            ...createVariantDto.attributes,
            isVariant: true,
            baseProductId: productId,
          },
          isActive: true,
        },
      });

      const variantDto: VendorProductVariantResponseDto = {
        id: variant.id.toString(),
        product_id: productId,
        variant_sku: createVariantDto.variantSku || `VAR-${variant.id}`,
        attributes: (variant.specifications as Record<string, any>) || {},
        price_override: Number(variant.price),
        is_active: variant.isActive,
        created_at: variant.createdAt,
        updated_at: variant.updatedAt,
      };

      this.logger.log(
        `Created product variant ${variant.id} for vendor ${vendor.id}`,
      );
      return variantDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error creating variant for product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to create product variant');
    }
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    userId: string,
    updateVariantDto: any,
  ): Promise<VendorProductVariantResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Get current variant to merge specifications
      const currentVariant = await this.prisma.product.findUnique({
        where: {
          id: BigInt(variantId),
          vendorId: BigInt(vendor.id),
        },
      });

      if (!currentVariant) {
        throw new NotFoundException('Variant not found');
      }

      const newSpecifications = updateVariantDto.attributes
        ? {
            ...((currentVariant.specifications as Record<string, any>) || {}),
            ...updateVariantDto.attributes,
          }
        : undefined;

      // Update the variant product
      const updatedVariant = await this.prisma.product.update({
        where: {
          id: BigInt(variantId),
          vendorId: BigInt(vendor.id),
        },
        data: {
          price: updateVariantDto.priceOverride,
          specifications: newSpecifications,
          isActive: updateVariantDto.isActive,
          updatedAt: new Date(),
        },
      });

      const variantDto: VendorProductVariantResponseDto = {
        id: updatedVariant.id.toString(),
        product_id: productId,
        variant_sku: `VAR-${updatedVariant.id}`,
        attributes:
          (updatedVariant.specifications as Record<string, any>) || {},
        price_override: Number(updatedVariant.price),
        is_active: updatedVariant.isActive,
        created_at: updatedVariant.createdAt,
        updated_at: updatedVariant.updatedAt,
      };

      this.logger.log(
        `Updated product variant ${variantId} for vendor ${vendor.id}`,
      );
      return variantDto;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Variant not found or does not belong to this vendor',
        );
      }
      this.logger.error(`Error updating variant ${variantId}:`, error);
      throw new BadRequestException('Failed to update product variant');
    }
  }

  async deleteProductVariant(
    productId: string,
    variantId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Delete the variant product
      await this.prisma.product.delete({
        where: {
          id: BigInt(variantId),
          vendorId: BigInt(vendor.id),
        },
      });

      this.logger.log(
        `Deleted product variant ${variantId} for vendor ${vendor.id}`,
      );
      return { message: 'Product variant deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Variant not found or does not belong to this vendor',
        );
      }
      this.logger.error(`Error deleting variant ${variantId}:`, error);
      throw new BadRequestException('Failed to delete product variant');
    }
  }

  async getProductCategories(userId: string): Promise<string[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const categories = await this.prisma.product.findMany({
        where: {
          vendorId: BigInt(vendor.id),
          isActive: true,
        },
        select: {
          category: true,
        },
        distinct: ['category'],
      });

      return categories.map((c) => c.category).filter(Boolean);
    } catch (error) {
      this.logger.error(
        `Error fetching categories for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch product categories');
    }
  }

  async bulkProductOperations(
    userId: string,
    bulkOperationsDto: any,
  ): Promise<{ message: string; processed: number }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      let processed = 0;

      // Handle different operation types
      if (
        bulkOperationsDto.operation === 'update_stock' &&
        bulkOperationsDto.products
      ) {
        for (const productOp of bulkOperationsDto.products) {
          await this.prisma.product.updateMany({
            where: {
              id: BigInt(productOp.productId),
              vendorId: BigInt(vendor.id),
            },
            data: {
              stockQuantity: productOp.stockQuantity,
              updatedAt: new Date(),
            },
          });
          processed++;
        }
      } else if (
        bulkOperationsDto.operation === 'update_price' &&
        bulkOperationsDto.products
      ) {
        for (const productOp of bulkOperationsDto.products) {
          await this.prisma.product.updateMany({
            where: {
              id: BigInt(productOp.productId),
              vendorId: BigInt(vendor.id),
            },
            data: {
              price: productOp.price,
              updatedAt: new Date(),
            },
          });
          processed++;
        }
      } else if (
        bulkOperationsDto.operation === 'deactivate' &&
        bulkOperationsDto.productIds
      ) {
        await this.prisma.product.updateMany({
          where: {
            id: {
              in: bulkOperationsDto.productIds.map((id: string) => BigInt(id)),
            },
            vendorId: BigInt(vendor.id),
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });
        processed = bulkOperationsDto.productIds.length;
      }

      this.logger.log(
        `Performed bulk operations for vendor ${vendor.id}, processed ${processed} items`,
      );
      return { message: 'Bulk operations completed successfully', processed };
    } catch (error) {
      this.logger.error(
        `Error performing bulk operations for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to perform bulk operations');
    }
  }

  // Analytics & Reports Methods
  async getSalesAnalytics(
    userId: string,
    analyticsQuery: SalesAnalyticsDto,
  ): Promise<SalesAnalyticsResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (analyticsQuery.period) {
        case 'daily':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      }

      // Override with custom dates if provided
      if (analyticsQuery.startDate) {
        startDate = new Date(analyticsQuery.startDate);
      }
      if (analyticsQuery.endDate) {
        endDate = new Date(analyticsQuery.endDate);
      }

      // Get total sales and orders
      const totalStats = await this.prisma.order.aggregate({
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['delivered', 'confirmed'], // Only count completed orders
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      const totalSales = Number(totalStats._sum.totalAmount || 0);
      const totalOrders = totalStats._count.id;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Get sales data grouped by date
      const salesDataRaw = await this.prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['delivered', 'confirmed'],
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const salesData = salesDataRaw.map((item) => ({
        date: item.createdAt.toISOString().split('T')[0],
        sales: Number(item._sum.totalAmount || 0),
        orders: item._count.id,
      }));

      // Get top products by sales
      const topProductsRaw = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            vendorId: BigInt(vendor.id),
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              in: ['delivered', 'confirmed'],
            },
          },
        },
        _sum: {
          totalPrice: true,
          quantity: true,
        },
        _count: {
          orderId: true,
        },
        orderBy: {
          _sum: {
            totalPrice: 'desc',
          },
        },
        take: 10,
      });

      // Get product names for top products
      const productIds = topProductsRaw.map((item) => BigInt(item.productId));
      const products = await this.prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const productMap = new Map(
        products.map((p) => [p.id.toString(), p.name]),
      );

      const topProducts = topProductsRaw.map((item) => ({
        productId: item.productId.toString(),
        productName:
          productMap.get(item.productId.toString()) || 'Unknown Product',
        sales: Number(item._sum.totalPrice || 0),
        orders: item._count.orderId,
      }));

      const analytics: SalesAnalyticsResponseDto = {
        vendorId: vendor.id,
        period: analyticsQuery.period,
        totalSales,
        totalOrders,
        averageOrderValue,
        salesData,
        topProducts,
      };

      this.logger.log(
        `Generated sales analytics for vendor ${vendor.id} for period ${analyticsQuery.period}`,
      );
      return analytics;
    } catch (error) {
      this.logger.error(
        `Error generating sales analytics for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to generate sales analytics');
    }
  }

  async getProductPerformance(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductPerformanceDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      // Get products with their performance metrics
      const products = await this.prisma.product.findMany({
        where: {
          vendorId: BigInt(vendor.id),
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          specifications: true,
          _count: {
            select: {
              OrderItem: {
                where: {
                  order: {
                    status: {
                      in: ['delivered', 'confirmed'],
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get sales aggregations for each product
      const productIds = products.map((p) => p.id);
      const salesData = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: {
            in: productIds,
          },
          order: {
            vendorId: BigInt(vendor.id),
            status: {
              in: ['delivered', 'confirmed'],
            },
          },
        },
        _sum: {
          totalPrice: true,
          quantity: true,
        },
        _count: {
          orderId: true,
        },
      });

      const salesMap = new Map(
        salesData.map((item) => [
          item.productId.toString(),
          {
            totalSales: Number(item._sum.totalPrice || 0),
            totalOrders: item._count.orderId,
            totalQuantity: item._sum.quantity || 0,
          },
        ]),
      );

      // Calculate stock turnover rate (simplified: total sold / current stock)
      const performanceData: ProductPerformanceDto[] = products.map(
        (product) => {
          const salesInfo = salesMap.get(product.id.toString()) || {
            totalSales: 0,
            totalOrders: 0,
            totalQuantity: 0,
          };

          const stockTurnoverRate =
            product.stockQuantity > 0
              ? salesInfo.totalQuantity / product.stockQuantity
              : 0;

          // Extract rating from specifications (assuming it's stored there)
          const specs = product.specifications as any;
          const averageRating = specs?.averageRating
            ? Number(specs.averageRating)
            : 0;
          const reviewCount = specs?.reviewCount
            ? Number(specs.reviewCount)
            : 0;

          return {
            productId: product.id.toString(),
            productName: product.name,
            totalSales: salesInfo.totalSales,
            totalOrders: salesInfo.totalOrders,
            averageRating,
            reviewCount,
            currentStock: product.stockQuantity,
            stockTurnoverRate: Number(stockTurnoverRate.toFixed(2)),
          };
        },
      );

      // Get total count for pagination
      const total = await this.prisma.product.count({
        where: {
          vendorId: BigInt(vendor.id),
          isActive: true,
        },
      });

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: performanceData,
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching product performance for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch product performance data');
    }
  }

  async getCustomerInsights(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CustomerInsightsDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      // Get customers who have ordered from this vendor
      const customerOrders = await this.prisma.order.groupBy({
        by: ['customerId'],
        where: {
          vendorId: BigInt(vendor.id),
          status: {
            in: ['delivered', 'confirmed'],
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
        _min: {
          createdAt: true,
        },
        _max: {
          createdAt: true,
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc',
          },
        },
        skip,
        take: limit,
      });

      // Get customer details
      const customerIds = customerOrders.map((co) => BigInt(co.customerId));
      const customers = await this.prisma.customer.findMany({
        where: {
          id: {
            in: customerIds,
          },
        },
        select: {
          id: true,
          name: true,
          uuid: true,
        },
      });

      const customerMap = new Map(
        customers.map((c) => [c.id.toString(), { name: c.name, uuid: c.uuid }]),
      );

      const insightsData: CustomerInsightsDto[] = customerOrders.map(
        (orderStats) => {
          const customerInfo = customerMap.get(
            orderStats.customerId.toString(),
          );
          const totalSpent = Number(orderStats._sum.totalAmount || 0);
          const totalOrders = orderStats._count.id;
          const averageOrderValue =
            totalOrders > 0 ? totalSpent / totalOrders : 0;

          // Calculate loyalty score based on order frequency and total spent
          // Simple algorithm: base score from order count + spending score
          const orderScore = Math.min(totalOrders * 5, 50); // Max 50 points for orders
          const spendingScore = Math.min(totalSpent / 100, 50); // Max 50 points for spending
          const loyaltyScore = Math.round(orderScore + spendingScore);

          return {
            customerId: customerInfo?.uuid || orderStats.customerId.toString(),
            customerName: customerInfo?.name || 'Unknown Customer',
            totalOrders,
            totalSpent,
            averageOrderValue: Number(averageOrderValue.toFixed(2)),
            firstOrderDate: orderStats._min.createdAt,
            lastOrderDate: orderStats._max.createdAt,
            loyaltyScore,
          };
        },
      );

      // Get total count for pagination
      const total = await this.prisma.order
        .groupBy({
          by: ['customerId'],
          where: {
            vendorId: BigInt(vendor.id),
            status: {
              in: ['delivered', 'confirmed'],
            },
          },
        })
        .then((groups) => groups.length);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: insightsData,
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching customer insights for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch customer insights');
    }
  }

  async getDailyReport(userId: string, date?: string): Promise<DailyReportDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const reportDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(
        reportDate.getFullYear(),
        reportDate.getMonth(),
        reportDate.getDate(),
      );
      const endOfDay = new Date(
        reportDate.getFullYear(),
        reportDate.getMonth(),
        reportDate.getDate() + 1,
      );

      // Get total sales and orders for the day
      const dailyStats = await this.prisma.order.aggregate({
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      const totalSales = Number(dailyStats._sum.totalAmount || 0);
      const totalOrders = dailyStats._count.id;

      // Get new customers for the day (first order on this date)
      const newCustomers = await this.prisma.order
        .groupBy({
          by: ['customerId'],
          where: {
            vendorId: BigInt(vendor.id),
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ['delivered', 'confirmed'],
            },
          },
        })
        .then((groups) => {
          // For simplicity, count all customers who ordered today as "new"
          // In a real implementation, you'd check if this is their first order ever
          return groups.length;
        });

      // Get top products for the day
      const topProductsRaw = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            vendorId: BigInt(vendor.id),
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ['delivered', 'confirmed'],
            },
          },
        },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        orderBy: {
          _sum: {
            totalPrice: 'desc',
          },
        },
        take: 10,
      });

      // Get product names
      const productIds = topProductsRaw.map((item) => BigInt(item.productId));
      const products = await this.prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const productMap = new Map(
        products.map((p) => [p.id.toString(), p.name]),
      );

      const topProducts = topProductsRaw.map((item) => ({
        productId: item.productId.toString(),
        productName:
          productMap.get(item.productId.toString()) || 'Unknown Product',
        quantity: item._sum.quantity || 0,
        revenue: Number(item._sum.totalPrice || 0),
      }));

      // Get order status breakdown
      const statusBreakdown = await this.prisma.order.groupBy({
        by: ['status'],
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _count: {
          id: true,
        },
      });

      const orderStatusBreakdown: Record<string, number> = {};
      statusBreakdown.forEach((item) => {
        orderStatusBreakdown[item.status] = item._count.id;
      });

      // Ensure all status types are present
      const allStatuses = [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'in_transit',
        'delivered',
        'cancelled',
      ];
      allStatuses.forEach((status) => {
        if (!(status in orderStatusBreakdown)) {
          orderStatusBreakdown[status] = 0;
        }
      });

      const report: DailyReportDto = {
        date: reportDate.toISOString().split('T')[0],
        totalSales,
        totalOrders,
        newCustomers,
        topProducts,
        orderStatusBreakdown,
      };

      this.logger.log(
        `Generated daily report for vendor ${vendor.id} for date ${report.date}`,
      );
      return report;
    } catch (error) {
      this.logger.error(
        `Error generating daily report for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to generate daily report');
    }
  }

  async getMonthlyReport(
    userId: string,
    month?: string,
  ): Promise<MonthlyReportDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const reportMonth = month || new Date().toISOString().slice(0, 7);
      const [year, monthNum] = reportMonth.split('-').map(Number);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 1);

      // Get current month stats
      const currentMonthStats = await this.prisma.order.aggregate({
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: {
            in: ['delivered', 'confirmed'],
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      const totalSales = Number(currentMonthStats._sum.totalAmount || 0);
      const totalOrders = currentMonthStats._count.id;

      // Calculate days in month for average
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const averageDailySales = totalSales / daysInMonth;

      // Get previous month stats for growth calculation
      const prevMonthStart = new Date(year, monthNum - 2, 1);
      const prevMonthEnd = new Date(year, monthNum - 1, 1);

      const prevMonthStats = await this.prisma.order.aggregate({
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: prevMonthStart,
            lte: prevMonthEnd,
          },
          status: {
            in: ['delivered', 'confirmed'],
          },
        },
        _sum: {
          totalAmount: true,
        },
      });

      const prevMonthSales = Number(prevMonthStats._sum.totalAmount || 0);
      const growthPercentage =
        prevMonthSales > 0
          ? ((totalSales - prevMonthSales) / prevMonthSales) * 100
          : 0;

      // Get daily breakdown for current month
      const dailyBreakdownRaw = await this.prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          vendorId: BigInt(vendor.id),
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: {
            in: ['delivered', 'confirmed'],
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Group by day
      const dailyMap = new Map<number, { sales: number; orders: number }>();
      dailyBreakdownRaw.forEach((item) => {
        const day = item.createdAt.getDate();
        const existing = dailyMap.get(day) || { sales: 0, orders: 0 };
        dailyMap.set(day, {
          sales: existing.sales + Number(item._sum.totalAmount || 0),
          orders: existing.orders + item._count.id,
        });
      });

      const dailyBreakdown = Array.from(dailyMap.entries())
        .map(([day, data]) => ({
          day,
          sales: Number(data.sales.toFixed(2)),
          orders: data.orders,
        }))
        .sort((a, b) => a.day - b.day);

      const report: MonthlyReportDto = {
        month: reportMonth,
        totalSales,
        totalOrders,
        averageDailySales: Number(averageDailySales.toFixed(2)),
        growthPercentage: Number(growthPercentage.toFixed(2)),
        dailyBreakdown,
      };

      this.logger.log(
        `Generated monthly report for vendor ${vendor.id} for month ${reportMonth}`,
      );
      return report;
    } catch (error) {
      this.logger.error(
        `Error generating monthly report for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to generate monthly report');
    }
  }

  // Inventory Management Methods
  async getInventoryStatus(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<InventoryStatusDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      // Get all ProductStoreMapping records for this vendor's products
      const [storeMappings, total] = await Promise.all([
        this.prisma.productStoreMapping.findMany({
          where: {
            store: {
              vendorId: BigInt(vendor.id),
            },
            product: {
              isActive: true,
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                specifications: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            updatedAt: 'desc',
          },
        }),
        this.prisma.productStoreMapping.count({
          where: {
            store: {
              vendorId: BigInt(vendor.id),
            },
            product: {
              isActive: true,
            },
          },
        }),
      ]);

      const inventoryData: InventoryStatusDto[] = storeMappings.map(
        (mapping) => {
          const product = mapping.product;
          const specs = product.specifications as any;
          // Get lowStockThreshold from product specifications or use default
          const lowStockThreshold = specs?.lowStockThreshold || 20;

          const currentStock = mapping.stockQuantity;
          const reservedStock = mapping.reservedStock;
          const availableStock = currentStock - reservedStock;
          const isLowStock = availableStock <= lowStockThreshold;

          return {
            productId: product.id.toString(),
            productName: product.name,
            currentStock,
            reservedStock,
            availableStock,
            lowStockThreshold,
            isLowStock,
            lastUpdated: mapping.updatedAt,
          };
        },
      );

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: inventoryData,
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching inventory status for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch inventory status');
    }
  }

  async updateInventory(
    productId: string,
    userId: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryStatusDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Find the ProductStoreMapping for this product and vendor's store
      const storeMapping = await this.prisma.productStoreMapping.findFirst({
        where: {
          productId: BigInt(productId),
          store: {
            vendorId: BigInt(vendor.id),
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              specifications: true,
            },
          },
        },
      });

      if (!storeMapping) {
        throw new NotFoundException(
          'Product not found in vendor inventory or store mapping does not exist',
        );
      }

      // Update the stock quantity
      const updatedMapping = await this.prisma.productStoreMapping.update({
        where: {
          id: storeMapping.id,
        },
        data: {
          stockQuantity: updateInventoryDto.quantity,
          updatedAt: new Date(),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              specifications: true,
            },
          },
        },
      });

      const product = updatedMapping.product;
      const specs = product.specifications as any;
      const lowStockThreshold = specs?.lowStockThreshold || 20;

      const currentStock = updatedMapping.stockQuantity;
      const reservedStock = updatedMapping.reservedStock;
      const availableStock = currentStock - reservedStock;
      const isLowStock = availableStock <= lowStockThreshold;

      this.logger.log(
        `Updated inventory for product ${productId} to ${updateInventoryDto.quantity}`,
      );

      return {
        productId: product.id.toString(),
        productName: product.name,
        currentStock,
        reservedStock,
        availableStock,
        lowStockThreshold,
        isLowStock,
        lastUpdated: updatedMapping.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating inventory for product ${productId}:`,
        error,
      );
      throw new BadRequestException('Failed to update inventory');
    }
  }

  async adjustInventory(
    userId: string,
    adjustmentDto: InventoryAdjustmentDto,
  ): Promise<{ message: string; newStock: number }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Find the ProductStoreMapping for this product and vendor's store
      const storeMapping = await this.prisma.productStoreMapping.findFirst({
        where: {
          productId: BigInt(adjustmentDto.productId),
          store: {
            vendorId: BigInt(vendor.id),
          },
        },
      });

      if (!storeMapping) {
        throw new NotFoundException(
          'Product not found in vendor inventory or store mapping does not exist',
        );
      }

      // Calculate new stock quantity
      const currentStock = storeMapping.stockQuantity;
      const newStock = Math.max(
        0,
        currentStock + adjustmentDto.adjustmentQuantity,
      );

      // Update the stock quantity
      await this.prisma.productStoreMapping.update({
        where: {
          id: storeMapping.id,
        },
        data: {
          stockQuantity: newStock,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Adjusted inventory for product ${adjustmentDto.productId} by ${adjustmentDto.adjustmentQuantity}. New stock: ${newStock}`,
      );

      return {
        message: `Inventory adjusted successfully`,
        newStock,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error adjusting inventory for product ${adjustmentDto.productId}:`,
        error,
      );
      throw new BadRequestException('Failed to adjust inventory');
    }
  }

  async getLowStockAlerts(userId: string): Promise<LowStockAlertDto[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    try {
      // Get all ProductStoreMapping records for this vendor's products
      const storeMappings = await this.prisma.productStoreMapping.findMany({
        where: {
          store: {
            vendorId: BigInt(vendor.id),
          },
          product: {
            isActive: true,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              specifications: true,
            },
          },
        },
      });

      const lowStockAlerts: LowStockAlertDto[] = [];

      for (const mapping of storeMappings) {
        const product = mapping.product;
        const specs = product.specifications as any;
        const lowStockThreshold = specs?.lowStockThreshold || 20;

        const currentStock = mapping.stockQuantity;
        const reservedStock = mapping.reservedStock;
        const availableStock = currentStock - reservedStock;

        // Check if stock is low
        if (availableStock <= lowStockThreshold) {
          // Determine severity based on stock level
          let severity: 'low' | 'medium' | 'high' | 'critical';
          const stockRatio = availableStock / lowStockThreshold;

          if (stockRatio <= 0.25) {
            severity = 'critical';
          } else if (stockRatio <= 0.5) {
            severity = 'high';
          } else if (stockRatio <= 0.75) {
            severity = 'medium';
          } else {
            severity = 'low';
          }

          lowStockAlerts.push({
            productId: product.id.toString(),
            productName: product.name,
            currentStock,
            lowStockThreshold,
            severity,
            alertDate: mapping.updatedAt,
          });
        }
      }

      this.logger.log(
        `Retrieved ${lowStockAlerts.length} low stock alerts for vendor ${vendor.id}`,
      );
      return lowStockAlerts;
    } catch (error) {
      this.logger.error(
        `Error fetching low stock alerts for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch low stock alerts');
    }
  }

  // Order Management Methods
  async getPendingOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'placed', // Assuming 'placed' is the pending status
          },
          include: {
            customer: true,
            address: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.order.count({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'placed',
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: orders.map((order) => this.mapOrderToOrderSummaryDto(order)),
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching pending orders for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch pending orders');
    }
  }

  async getCompletedOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'delivered',
          },
          include: {
            customer: true,
            address: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.order.count({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'delivered',
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: orders.map((order) => this.mapOrderToOrderSummaryDto(order)),
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching completed orders for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch completed orders');
    }
  }

  async getCancelledOrders(
    vendor: Vendor,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    try {
      const page = paginationQuery.page || 1;
      const limit = paginationQuery.limit || 20;
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'cancelled',
          },
          include: {
            customer: true,
            address: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.order.count({
          where: {
            vendorId: BigInt(vendor.id),
            status: 'cancelled',
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: orders.map((order) => this.mapOrderToOrderSummaryDto(order)),
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching cancelled orders for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch cancelled orders');
    }
  }

  async acceptOrder(
    orderId: string,
    vendor: Vendor,
    acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    try {
      // First, find the order to ensure it belongs to this vendor and is in acceptable state
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          orderUuid: orderId,
          vendorId: BigInt(vendor.id),
          status: 'placed', // Only accept orders that are placed/pending
        },
        include: {
          customer: true,
          address: true,
        },
      });

      if (!existingOrder) {
        throw new NotFoundException(
          'Order not found, does not belong to this vendor, or cannot be accepted',
        );
      }

      // Update the order status to confirmed
      const updatedOrder = await this.prisma.order.update({
        where: {
          id_createdAt: {
            id: existingOrder.id,
            createdAt: existingOrder.createdAt,
          },
        },
        data: {
          status: 'confirmed',
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          address: true,
        },
      });

      this.logger.log(`Accepted order ${orderId} for vendor ${vendor.id}`);
      return this.mapOrderToOrderSummaryDto(updatedOrder);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error accepting order ${orderId} for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to accept order');
    }
  }

  async rejectOrder(
    orderId: string,
    vendor: Vendor,
    rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    try {
      // First, find the order to ensure it belongs to this vendor and is in rejectable state
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          orderUuid: orderId,
          vendorId: BigInt(vendor.id),
          status: { in: ['placed', 'confirmed'] }, // Only reject orders that are placed or confirmed
        },
      });

      if (!existingOrder) {
        throw new NotFoundException(
          'Order not found, does not belong to this vendor, or cannot be rejected',
        );
      }

      // Update the order status to cancelled
      await this.prisma.order.update({
        where: {
          id_createdAt: {
            id: existingOrder.id,
            createdAt: existingOrder.createdAt,
          },
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Rejected order ${orderId} for vendor ${vendor.id} with reason: ${rejectOrderDto.reason}`,
      );

      return {
        message: `Order rejected: ${rejectOrderDto.reason}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error rejecting order ${orderId} for vendor ${vendor.id}:`,
        error,
      );
      throw new BadRequestException('Failed to reject order');
    }
  }

  private mapOrderToOrderResponseDto(order: any): OrderResponseDto {
    // For orders with multiple items, take the first item's details
    // This is a simplification since OrderResponseDto seems designed for single-item orders
    const firstItem = order.items?.[0];
    const totalQuantity =
      order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ||
      0;

    return {
      id: order.orderUuid,
      userId: order.customer?.uuid || order.customerId.toString(),
      vendorId: order.vendorId?.toString() || '',
      productId: firstItem?.productId?.toString() || '',
      quantity: totalQuantity,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      schedule: order.scheduledDelivery ? 'scheduled' : 'instant',
      deliveryTime: order.scheduledDelivery,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryAddress: {
        street: order.address?.street || '',
        city: order.address?.city || '',
        state: order.address?.state || '',
        pincode: order.address?.pincode || '',
        landmark: order.address?.landmark,
        latitude: Number(order.address?.latitude) || 0,
        longitude: Number(order.address?.longitude) || 0,
        contactPhone: order.address?.street ? '' : '', // Address doesn't have phone, customer might
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapOrderToOrderSummaryDto(order: any): OrderSummaryDto {
    return {
      id: order.orderUuid,
      customerId: order.customer?.uuid || order.customerId.toString(),
      customerName: order.customer?.name || 'Unknown Customer',
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      deliveryAddress:
        `${order.address?.street || ''}, ${order.address?.city || ''}, ${order.address?.pincode || ''}`.trim(),
      contactPhone: order.customer?.phone || '',
    };
  }

  private mapPrismaVendorToInterface(vendor: any): Vendor {
    return {
      id: vendor.id.toString(),
      userId: vendor.phone || vendor.email || '',
      businessName: vendor.name,
      businessAddress: vendor.addresses?.[0]?.line1 || '',
      businessPhone: vendor.phone,
      businessEmail: vendor.email,
      gstNumber: vendor.gstin,
      licenseNumber: '', // Not in schema
      documents: {}, // Not in schema
      approvalStatus:
        vendor.kycStatus === 'verified' ? 'approved' : 'pending_approval',
      rejectionReason: undefined,
      bankAccounts: [], // Would need BankAccount model
      deliveryZones: [], // We'll derive from products
      isActive: vendor.isActive,
      rating: Number(vendor.rating) || 0,
      totalOrders: 0, // Would need to calculate from orders
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  private mapProductToProductResponseDto(
    product: any,
    vendor: Vendor,
  ): ProductResponseDto {
    return {
      id: product.id.toString(),
      vendorId: vendor.id,
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.capacity, // Using capacity as size
      price: Number(product.price),
      depositAmount: Number(product.depositAmount),
      hasDeposit: product.hasDeposit,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      images: product.images,
      specifications: product.specifications || {
        capacity: parseFloat(product.capacity) || 0,
        material: 'Plastic',
        brand: 'Generic',
      },
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        rating: vendor.rating,
        totalOrders: vendor.totalOrders,
        deliveryZones: vendor.deliveryZones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          deliveryFee: zone.deliveryFee,
          minOrderAmount: zone.minOrderAmount,
          maxDeliveryTime: zone.maxDeliveryTime,
          isActive: zone.isActive,
        })),
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
