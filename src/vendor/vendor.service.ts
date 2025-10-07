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
} from '../common/interfaces/vendor.interface';
import {
  CreateProductDto,
  ProductResponseDto,
} from '../common/dto/product.dto';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../common/dto/order.dto';
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
} from '../common/dto/vendor.dto';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);
  private readonly vendors = new Map<string, Vendor>();
  private readonly userVendorIndex = new Map<string, string>(); // userId -> vendorId

  async findById(id: string): Promise<Vendor | null> {
    return this.vendors.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Vendor | null> {
    const vendorId = this.userVendorIndex.get(userId);
    if (!vendorId) return null;
    return this.vendors.get(vendorId) || null;
  }

  async findByLocation(lat: number, lng: number): Promise<Vendor[]> {
    const vendors: Vendor[] = [];

    for (const vendor of this.vendors.values()) {
      if (!vendor.isActive) continue;

      // Check if location is within any delivery zone
      const isInDeliveryZone = vendor.deliveryZones.some((zone) => {
        if (!zone.isActive) return false;
        return this.isPointInDeliveryZone(lat, lng, zone);
      });

      if (isInDeliveryZone) {
        vendors.push(vendor);
      }
    }

    // Sort by rating and total orders
    vendors.sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      return b.totalOrders - a.totalOrders;
    });

    return vendors;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(
      (vendor) => vendor.isActive,
    );
  }

  async create(userId: string, businessName: string): Promise<Vendor> {
    const vendor: Vendor = {
      id: uuidv4(),
      userId,
      businessName,
      businessAddress: '',
      approvalStatus: 'pending_approval',
      bankAccounts: [],
      deliveryZones: [],
      isActive: true,
      rating: 4.0 + Math.random(), // Random rating between 4.0-5.0
      totalOrders: Math.floor(Math.random() * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.vendors.set(vendor.id, vendor);
    this.userVendorIndex.set(userId, vendor.id);

    this.logger.log(`Created vendor: ${vendor.id} for user: ${userId}`);
    return vendor;
  }

  async addDeliveryZone(
    vendorId: string,
    zoneName: string,
    coordinates: { latitude: number; longitude: number }[],
    deliveryFee: number,
  ): Promise<DeliveryZone> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const zone: DeliveryZone = {
      id: uuidv4(),
      vendorId,
      name: zoneName,
      coordinates,
      deliveryFee,
      minOrderAmount: 50,
      maxDeliveryTime: 60, // 1 hour
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vendor.deliveryZones.push(zone);
    vendor.updatedAt = new Date();

    this.vendors.set(vendorId, vendor);
    this.logger.log(`Added delivery zone ${zone.id} to vendor ${vendorId}`);
    return zone;
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

  // Seed test data
  async seedTestData(): Promise<void> {
    const testVendors = [
      {
        userId: '48effa26-8a5e-4a8b-92f6-4943b7f4ffd6', // Test vendor user (8888888888)
        businessName: 'AquaPure Water Solutions',
        zones: [
          { name: 'Central Delhi', lat: 28.6139, lng: 77.209 },
          { name: 'South Delhi', lat: 28.5355, lng: 77.391 },
        ],
      },
      {
        userId: 'vendor-2',
        businessName: 'Crystal Clear Waters',
        zones: [
          { name: 'Gurgaon Sector 1-20', lat: 28.4595, lng: 77.0266 },
          { name: 'Gurgaon Sector 21-40', lat: 28.4089, lng: 77.0424 },
        ],
      },
      {
        userId: 'vendor-3',
        businessName: 'Fresh Drop Delivery',
        zones: [
          { name: 'Noida Sector 1-30', lat: 28.5355, lng: 77.391 },
          { name: 'Greater Noida', lat: 28.4744, lng: 77.504 },
        ],
      },
    ];

    for (const vendorData of testVendors) {
      const existingVendor = await this.findByUserId(vendorData.userId);
      if (!existingVendor) {
        const vendor = await this.create(
          vendorData.userId,
          vendorData.businessName,
        );

        // Add delivery zones
        for (const zone of vendorData.zones) {
          await this.addDeliveryZone(
            vendor.id,
            zone.name,
            [
              { latitude: zone.lat - 0.01, longitude: zone.lng - 0.01 },
              { latitude: zone.lat + 0.01, longitude: zone.lng - 0.01 },
              { latitude: zone.lat + 0.01, longitude: zone.lng + 0.01 },
              { latitude: zone.lat - 0.01, longitude: zone.lng + 0.01 },
            ],
            15,
          );
        }
      }
    }

    this.logger.log('Vendor test data seeded successfully');
  }

  // Vendor Dashboard Methods
  async getVendorOrders(userId: string): Promise<OrderResponseDto[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In a real implementation, this would fetch orders from OrderService
    // For now, return mock data
    const mockOrders: OrderResponseDto[] = [
      {
        id: 'order-1',
        userId: 'customer-1',
        vendorId: vendor.id,
        productId: 'product-1',
        quantity: 2,
        totalAmount: 150,
        status: 'confirmed',
        schedule: 'instant',
        paymentMethod: 'wallet',
        paymentStatus: 'completed',
        deliveryAddress: {
          street: '123 Customer Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9876543210',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return mockOrders;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In a real implementation, this would update the order through OrderService
    // For now, return mock updated order
    const updatedOrder: OrderResponseDto = {
      id: orderId,
      userId: 'customer-1',
      vendorId: vendor.id,
      productId: 'product-1',
      quantity: 2,
      totalAmount: 150,
      status: updateOrderStatusDto.status,
      schedule: 'instant',
      paymentMethod: 'wallet',
      paymentStatus: 'completed',
      deliveryAddress: {
        street: '123 Customer Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: 28.6139,
        longitude: 77.209,
        contactPhone: '9876543210',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(
      `Updated order ${orderId} status to ${updateOrderStatusDto.status}`,
    );
    return updatedOrder;
  }

  async getVendorProducts(userId: string): Promise<ProductResponseDto[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In a real implementation, this would fetch products from ProductService
    // For now, return mock data
    const mockProducts: ProductResponseDto[] = [
      {
        id: 'product-1',
        vendorId: vendor.id,
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar',
        category: 'water_jar',
        size: '20L',
        price: 30,
        depositAmount: 75,
        hasDeposit: true,
        stockQuantity: 50,
        isActive: true,
        images: ['/images/jar-20l.jpg'],
        specifications: {
          capacity: 20,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return mockProducts;
  }

  async createProduct(
    userId: string,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In a real implementation, this would create product through ProductService
    // For now, return mock created product
    const newProduct: ProductResponseDto = {
      id: uuidv4(),
      vendorId: vendor.id,
      name: createProductDto.name,
      description: createProductDto.description,
      category: createProductDto.category,
      size: createProductDto.size,
      price: createProductDto.price,
      depositAmount: createProductDto.depositAmount,
      hasDeposit: createProductDto.hasDeposit,
      stockQuantity: createProductDto.stockQuantity,
      isActive: true,
      images: createProductDto.images || [],
      specifications: {
        capacity: this.getSizeCapacity(createProductDto.size),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Created product ${newProduct.id} for vendor ${vendor.id}`);
    return newProduct;
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

    // In a real implementation, this would update product stock through ProductService
    // For now, return mock updated product
    const updatedProduct: ProductResponseDto = {
      id: productId,
      vendorId: vendor.id,
      name: '20L Water Jar',
      description: 'Premium quality 20L water jar',
      category: 'water_jar',
      size: '20L',
      price: 30,
      depositAmount: 75,
      hasDeposit: true,
      stockQuantity: Math.max(0, quantity), // Ensure non-negative stock
      isActive: true,
      images: ['/images/jar-20l.jpg'],
      specifications: {
        capacity: 20,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Updated stock for product ${productId} to ${quantity}`);
    return updatedProduct;
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

    // In real implementation, fetch from database
    // For now, return mock store data
    return {
      id: 'store-1',
      vendor_id: vendor.id,
      name: `${vendor.businessName} Store`,
      address: vendor.businessAddress || 'Default Address',
      phone: '9876543210',
      active_hours: {
        monday: { open: '09:00', close: '21:00' },
        tuesday: { open: '09:00', close: '21:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '21:00' },
        saturday: { open: '09:00', close: '22:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  async updateStore(
    userId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, update store in database
    // For now, return updated mock data
    const updatedStore: StoreResponseDto = {
      id: 'store-1',
      vendor_id: vendor.id,
      name: updateStoreDto.name || `${vendor.businessName} Store`,
      address:
        updateStoreDto.address || vendor.businessAddress || 'Default Address',
      phone: updateStoreDto.phone || '9876543210',
      active_hours: updateStoreDto.active_hours || {
        monday: { open: '09:00', close: '21:00' },
        tuesday: { open: '09:00', close: '21:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '21:00' },
        saturday: { open: '09:00', close: '22:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      is_active: updateStoreDto.is_active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.logger.log(`Updated store for vendor ${vendor.id}`);
    return updatedStore;
  }

  async createStoreHours(
    userId: string,
    createStoreHoursDto: CreateStoreHoursDto,
  ): Promise<StoreHoursResponseDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, save to database
    // For now, return mock created hours
    const storeHours: StoreHoursResponseDto = {
      id: uuidv4(),
      storeId: 'store-1',
      day: createStoreHoursDto.day,
      openTime: createStoreHoursDto.openTime,
      closeTime: createStoreHoursDto.closeTime,
      isClosed: createStoreHoursDto.isClosed,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(
      `Created store hours ${storeHours.id} for vendor ${vendor.id}`,
    );
    return storeHours;
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

    // In real implementation, update in database
    // For now, return mock updated hours
    const updatedHours: StoreHoursResponseDto = {
      id: hoursId,
      storeId: 'store-1',
      day: 'monday', // Would be fetched from database
      openTime: updateStoreHoursDto.openTime || '09:00',
      closeTime: updateStoreHoursDto.closeTime || '21:00',
      isClosed: updateStoreHoursDto.isClosed ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Updated store hours ${hoursId} for vendor ${vendor.id}`);
    return updatedHours;
  }

  async deleteStoreHours(
    hoursId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, delete from database
    this.logger.log(`Deleted store hours ${hoursId} for vendor ${vendor.id}`);
    return { message: 'Store hours deleted successfully' };
  }

  async updateStoreStatus(
    userId: string,
    updateStoreStatusDto: UpdateStoreStatusDto,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, update store status in database
    this.logger.log(
      `Updated store status to ${updateStoreStatusDto.status} for vendor ${vendor.id}`,
    );

    return {
      message: `Store status updated to ${updateStoreStatusDto.status}`,
    };
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

    // In real implementation, fetch from database with pagination
    // For now, return mock data
    const mockVariants: VendorProductVariantResponseDto[] = [
      {
        id: 'variant-1',
        product_id: productId,
        variant_sku: 'PW-20L-MINERAL-001',
        attributes: { type: 'mineral', brand: 'AquaPure' },
        price_override: 55.0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const total = mockVariants.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockVariants,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
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

    // In real implementation, save to database
    const newVariant: VendorProductVariantResponseDto = {
      id: uuidv4(),
      product_id: productId,
      variant_sku: createVariantDto.variantSku,
      attributes: createVariantDto.attributes,
      price_override: createVariantDto.priceOverride,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.logger.log(
      `Created product variant ${newVariant.id} for vendor ${vendor.id}`,
    );
    return newVariant;
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

    // In real implementation, update in database
    const updatedVariant: VendorProductVariantResponseDto = {
      id: variantId,
      product_id: productId,
      variant_sku: 'PW-20L-MINERAL-001', // Would be fetched from database
      attributes: updateVariantDto.attributes,
      price_override: updateVariantDto.priceOverride,
      is_active: updateVariantDto.isActive ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.logger.log(
      `Updated product variant ${variantId} for vendor ${vendor.id}`,
    );
    return updatedVariant;
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

    // In real implementation, delete from database
    this.logger.log(
      `Deleted product variant ${variantId} for vendor ${vendor.id}`,
    );
    return { message: 'Product variant deleted successfully' };
  }

  async getProductCategories(userId: string): Promise<string[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, fetch unique categories from products
    // For now, return mock categories
    return ['water_jar', 'water_bottle', 'accessories', 'services'];
  }

  async bulkProductOperations(
    userId: string,
    bulkOperationsDto: any,
  ): Promise<{ message: string; processed: number }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, perform bulk operations on products
    // For now, return mock result
    this.logger.log(`Performed bulk operations for vendor ${vendor.id}`);
    return { message: 'Bulk operations completed successfully', processed: 10 };
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

    // In real implementation, calculate analytics from orders and sales data
    // For now, return mock analytics
    const mockAnalytics: SalesAnalyticsResponseDto = {
      vendorId: vendor.id,
      period: analyticsQuery.period,
      totalSales: 15000.0,
      totalOrders: 150,
      averageOrderValue: 100.0,
      salesData: [
        { date: '2024-01-01', sales: 500, orders: 5 },
        { date: '2024-01-02', sales: 750, orders: 8 },
        { date: '2024-01-03', sales: 600, orders: 6 },
      ],
      topProducts: [
        {
          productId: 'prod-1',
          productName: '20L Water Jar',
          sales: 5000,
          orders: 50,
        },
        {
          productId: 'prod-2',
          productName: '10L Water Jar',
          sales: 3000,
          orders: 60,
        },
      ],
    };

    this.logger.log(`Generated sales analytics for vendor ${vendor.id}`);
    return mockAnalytics;
  }

  async getProductPerformance(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductPerformanceDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, calculate performance metrics from sales data
    // For now, return mock performance data
    const mockPerformance: ProductPerformanceDto[] = [
      {
        productId: 'prod-1',
        productName: '20L Water Jar',
        totalSales: 5000.0,
        totalOrders: 50,
        averageRating: 4.5,
        reviewCount: 25,
        currentStock: 100,
        stockTurnoverRate: 2.5,
      },
      {
        productId: 'prod-2',
        productName: '10L Water Jar',
        totalSales: 3000.0,
        totalOrders: 60,
        averageRating: 4.2,
        reviewCount: 18,
        currentStock: 75,
        stockTurnoverRate: 3.2,
      },
    ];

    const total = mockPerformance.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockPerformance,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getCustomerInsights(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CustomerInsightsDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, analyze customer behavior from order history
    // For now, return mock customer insights
    const mockInsights: CustomerInsightsDto[] = [
      {
        customerId: 'cust-1',
        customerName: 'John Doe',
        totalOrders: 15,
        totalSpent: 1500.0,
        averageOrderValue: 100.0,
        firstOrderDate: new Date('2024-01-01'),
        lastOrderDate: new Date('2024-01-15'),
        loyaltyScore: 85,
      },
      {
        customerId: 'cust-2',
        customerName: 'Jane Smith',
        totalOrders: 8,
        totalSpent: 800.0,
        averageOrderValue: 100.0,
        firstOrderDate: new Date('2024-01-05'),
        lastOrderDate: new Date('2024-01-12'),
        loyaltyScore: 72,
      },
    ];

    const total = mockInsights.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockInsights,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getDailyReport(userId: string, date?: string): Promise<DailyReportDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const reportDate = date ? new Date(date) : new Date();

    // In real implementation, generate report from daily sales data
    // For now, return mock daily report
    const mockReport: DailyReportDto = {
      date: reportDate.toISOString().split('T')[0],
      totalSales: 5000.0,
      totalOrders: 50,
      newCustomers: 5,
      topProducts: [
        {
          productId: 'prod-1',
          productName: '20L Water Jar',
          quantity: 25,
          revenue: 2500,
        },
        {
          productId: 'prod-2',
          productName: '10L Water Jar',
          quantity: 15,
          revenue: 1500,
        },
      ],
      orderStatusBreakdown: {
        pending: 5,
        confirmed: 20,
        in_transit: 15,
        delivered: 10,
        cancelled: 0,
      },
    };

    this.logger.log(`Generated daily report for vendor ${vendor.id}`);
    return mockReport;
  }

  async getMonthlyReport(
    userId: string,
    month?: string,
  ): Promise<MonthlyReportDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const reportMonth = month || new Date().toISOString().slice(0, 7);

    // In real implementation, generate report from monthly sales data
    // For now, return mock monthly report
    const mockReport: MonthlyReportDto = {
      month: reportMonth,
      totalSales: 150000.0,
      totalOrders: 1500,
      averageDailySales: 5000.0,
      growthPercentage: 15.5,
      dailyBreakdown: [
        { day: 1, sales: 4500, orders: 45 },
        { day: 2, sales: 5200, orders: 52 },
        { day: 3, sales: 4800, orders: 48 },
      ],
    };

    this.logger.log(`Generated monthly report for vendor ${vendor.id}`);
    return mockReport;
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

    // In real implementation, fetch inventory data from database
    // For now, return mock inventory status
    const mockInventory: InventoryStatusDto[] = [
      {
        productId: 'prod-1',
        productName: '20L Water Jar',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        lowStockThreshold: 20,
        isLowStock: false,
        lastUpdated: new Date(),
      },
      {
        productId: 'prod-2',
        productName: '10L Water Jar',
        currentStock: 15,
        reservedStock: 5,
        availableStock: 10,
        lowStockThreshold: 20,
        isLowStock: true,
        lastUpdated: new Date(),
      },
    ];

    const total = mockInventory.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockInventory,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
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

    // In real implementation, update inventory in database
    // For now, return mock updated inventory
    const updatedInventory: InventoryStatusDto = {
      productId,
      productName: '20L Water Jar', // Would be fetched from database
      currentStock: updateInventoryDto.quantity,
      reservedStock: 0, // Would be calculated
      availableStock: updateInventoryDto.quantity,
      lowStockThreshold: 20,
      isLowStock: updateInventoryDto.quantity < 20,
      lastUpdated: new Date(),
    };

    this.logger.log(
      `Updated inventory for product ${productId} to ${updateInventoryDto.quantity}`,
    );
    return updatedInventory;
  }

  async adjustInventory(
    userId: string,
    adjustmentDto: InventoryAdjustmentDto,
  ): Promise<{ message: string; newStock: number }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, adjust inventory in database
    // For now, return mock adjustment result
    const newStock = 100 + adjustmentDto.adjustmentQuantity; // Mock calculation

    this.logger.log(
      `Adjusted inventory for product ${adjustmentDto.productId} by ${adjustmentDto.adjustmentQuantity}`,
    );

    return {
      message: `Inventory adjusted successfully`,
      newStock: Math.max(0, newStock),
    };
  }

  async getLowStockAlerts(userId: string): Promise<LowStockAlertDto[]> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, fetch products with low stock
    // For now, return mock alerts
    const mockAlerts: LowStockAlertDto[] = [
      {
        productId: 'prod-2',
        productName: '10L Water Jar',
        currentStock: 15,
        lowStockThreshold: 20,
        severity: 'medium',
        alertDate: new Date(),
      },
    ];

    this.logger.log(`Retrieved low stock alerts for vendor ${vendor.id}`);
    return mockAlerts;
  }

  // Order Management Methods
  async getPendingOrders(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, fetch pending orders from database
    // For now, return mock pending orders
    const mockOrders: OrderSummaryDto[] = [
      {
        id: 'order-1',
        customerId: 'cust-1',
        customerName: 'John Doe',
        status: 'pending',
        totalAmount: 150.0,
        createdAt: new Date(),
        deliveryAddress: '123 Customer Street, Delhi, 110001',
        contactPhone: '+91-9876543210',
      },
    ];

    const total = mockOrders.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockOrders,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getCompletedOrders(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, fetch completed orders from database
    // For now, return mock completed orders
    const mockOrders: OrderSummaryDto[] = [
      {
        id: 'order-2',
        customerId: 'cust-2',
        customerName: 'Jane Smith',
        status: 'delivered',
        totalAmount: 200.0,
        createdAt: new Date(),
        deliveryAddress: '456 Customer Avenue, Delhi, 110002',
        contactPhone: '+91-9876543211',
      },
    ];

    const total = mockOrders.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockOrders,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getCancelledOrders(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, fetch cancelled orders from database
    // For now, return empty array (no cancelled orders)
    const mockOrders: OrderSummaryDto[] = [];

    const total = mockOrders.length;
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 20;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: mockOrders,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async acceptOrder(
    orderId: string,
    userId: string,
    acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, update order status in database
    // For now, return mock accepted order
    const acceptedOrder: OrderSummaryDto = {
      id: orderId,
      customerId: 'cust-1',
      customerName: 'John Doe',
      status: 'confirmed',
      totalAmount: 150.0,
      createdAt: new Date(),
      deliveryAddress: '123 Customer Street, Delhi, 110001',
      contactPhone: '+91-9876543210',
    };

    this.logger.log(`Accepted order ${orderId} for vendor ${vendor.id}`);
    return acceptedOrder;
  }

  async rejectOrder(
    orderId: string,
    userId: string,
    rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // In real implementation, update order status in database
    this.logger.log(
      `Rejected order ${orderId} for vendor ${vendor.id} with reason: ${rejectOrderDto.reason}`,
    );

    return {
      message: `Order rejected: ${rejectOrderDto.reason}`,
    };
  }
}
