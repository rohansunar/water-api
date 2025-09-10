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
}
