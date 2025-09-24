import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorService } from './vendor.service';

describe('VendorService', () => {
  let service: VendorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorService],
    }).compile();

    service = module.get<VendorService>(VendorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return vendor if found', async () => {
      const vendor = {
        id: 'vendor-id',
        userId: 'user-id',
        businessName: 'Test Vendor',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-id', vendor);

      const result = await service.findById('vendor-id');

      expect(result).toEqual(vendor);
    });

    it('should return null if vendor not found', async () => {
      const result = await service.findById('non-existent-vendor');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return vendor if found', async () => {
      const vendor = {
        id: 'vendor-id',
        userId: 'user-id',
        businessName: 'Test Vendor',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');

      const result = await service.findByUserId('user-id');

      expect(result).toEqual(vendor);
    });

    it('should return null if vendor not found', async () => {
      const result = await service.findByUserId('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('findByLocation', () => {
    it('should return vendors within delivery zones sorted by rating', async () => {
      const vendor1 = {
        id: 'vendor-1',
        userId: 'user-1',
        businessName: 'Vendor 1',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [
          {
            id: 'zone-1',
            vendorId: 'vendor-1',
            name: 'Zone 1',
            coordinates: [{ latitude: 28.6139, longitude: 77.209 }],
            deliveryFee: 15,
            minOrderAmount: 50,
            maxDeliveryTime: 60,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const vendor2 = {
        id: 'vendor-2',
        userId: 'user-2',
        businessName: 'Vendor 2',
        isActive: true,
        rating: 4.8,
        totalOrders: 200,
        deliveryZones: [
          {
            id: 'zone-2',
            vendorId: 'vendor-2',
            name: 'Zone 2',
            coordinates: [{ latitude: 28.6139, longitude: 77.209 }],
            deliveryFee: 15,
            minOrderAmount: 50,
            maxDeliveryTime: 60,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-1', vendor1);
      (service as any).vendors.set('vendor-2', vendor2);

      const result = await service.findByLocation(28.6139, 77.209);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('vendor-2'); // Higher rating first
      expect(result[1].id).toBe('vendor-1');
    });

    it('should exclude inactive vendors', async () => {
      const inactiveVendor = {
        id: 'inactive-vendor',
        userId: 'user-1',
        businessName: 'Inactive Vendor',
        isActive: false,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [
          {
            id: 'zone-1',
            vendorId: 'inactive-vendor',
            name: 'Zone 1',
            coordinates: [{ latitude: 28.6139, longitude: 77.209 }],
            deliveryFee: 15,
            minOrderAmount: 50,
            maxDeliveryTime: 60,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('inactive-vendor', inactiveVendor);

      const result = await service.findByLocation(28.6139, 77.209);

      expect(result).toHaveLength(0);
    });

    it('should exclude vendors with inactive delivery zones', async () => {
      const vendor = {
        id: 'vendor-1',
        userId: 'user-1',
        businessName: 'Vendor 1',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [
          {
            id: 'zone-1',
            vendorId: 'vendor-1',
            name: 'Zone 1',
            coordinates: [{ latitude: 28.6139, longitude: 77.209 }],
            deliveryFee: 15,
            minOrderAmount: 50,
            maxDeliveryTime: 60,
            isActive: false, // Inactive zone
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-1', vendor);

      const result = await service.findByLocation(28.6139, 77.209);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAllVendors', () => {
    it('should return all active vendors', async () => {
      const vendor1 = {
        id: 'vendor-1',
        userId: 'user-1',
        businessName: 'Vendor 1',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const vendor2 = {
        id: 'vendor-2',
        userId: 'user-2',
        businessName: 'Vendor 2',
        isActive: false, // Inactive
        rating: 4.8,
        totalOrders: 200,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-1', vendor1);
      (service as any).vendors.set('vendor-2', vendor2);

      const result = await service.getAllVendors();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('vendor-1');
    });
  });

  describe('create', () => {
    it('should create vendor successfully', async () => {
      const result = await service.create('user-id', 'Test Business');

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe('user-id');
      expect(result.businessName).toBe('Test Business');
      expect(result.isActive).toBe(true);
      expect(result.approvalStatus).toBe('pending_approval');
      expect(result.rating).toBeGreaterThanOrEqual(4.0);
      expect(result.rating).toBeLessThanOrEqual(5.0);
      expect(result.totalOrders).toBeGreaterThanOrEqual(0);
      expect(result.totalOrders).toBeLessThanOrEqual(999);
    });
  });

  describe('addDeliveryZone', () => {
    it('should add delivery zone successfully', async () => {
      const vendor = {
        id: 'vendor-id',
        userId: 'user-id',
        businessName: 'Test Vendor',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-id', vendor);

      const coordinates = [
        { latitude: 28.6139, longitude: 77.209 },
        { latitude: 28.6239, longitude: 77.219 },
      ];

      const result = await service.addDeliveryZone('vendor-id', 'Test Zone', coordinates, 15);

      expect(result).toHaveProperty('id');
      expect(result.vendorId).toBe('vendor-id');
      expect(result.name).toBe('Test Zone');
      expect(result.coordinates).toEqual(coordinates);
      expect(result.deliveryFee).toBe(15);
      expect(result.minOrderAmount).toBe(50);
      expect(result.maxDeliveryTime).toBe(60);
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent vendor', async () => {
      const coordinates = [{ latitude: 28.6139, longitude: 77.209 }];

      await expect(service.addDeliveryZone('non-existent', 'Test Zone', coordinates, 15)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('seedTestData', () => {
    it('should seed test data successfully', async () => {
      await service.seedTestData();

      // Check if test vendors were created
      const vendor1 = await service.findByUserId('48effa26-8a5e-4a8b-92f6-4943b7f4ffd6');
      const vendor2 = await service.findByUserId('vendor-2');
      const vendor3 = await service.findByUserId('vendor-3');

      expect(vendor1).toBeTruthy();
      expect(vendor1?.businessName).toBe('AquaPure Water Solutions');
      expect(vendor1?.deliveryZones).toHaveLength(2);

      expect(vendor2).toBeTruthy();
      expect(vendor2?.businessName).toBe('Crystal Clear Waters');

      expect(vendor3).toBeTruthy();
      expect(vendor3?.businessName).toBe('Fresh Drop Delivery');
    });

    it('should not create duplicate vendors', async () => {
      await service.seedTestData();
      await service.seedTestData(); // Run again

      // Should still work without errors
      const vendor = await service.findByUserId('48effa26-8a5e-4a8b-92f6-4943b7f4ffd6');
      expect(vendor).toBeTruthy();
    });
  });

  describe('getVendorOrders', () => {
    it('should return vendor orders', async () => {
      const vendor = {
        id: 'vendor-id',
        userId: 'user-id',
        businessName: 'Test Vendor',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');

      const result = await service.getVendorOrders('user-id');

      expect(result).toHaveLength(1);
      expect(result[0].vendorId).toBe('vendor-id');
    });

    it('should throw NotFoundException if vendor not found', async () => {
      await expect(service.getVendorOrders('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    const vendor = {
      id: 'vendor-id',
      userId: 'user-id',
      businessName: 'Test Vendor',
      isActive: true,
      rating: 4.5,
      totalOrders: 100,
      deliveryZones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');
    });

    it('should update order status successfully', async () => {
      const updateDto = { status: 'out_for_delivery' as any };

      const result = await service.updateOrderStatus('order-1', 'user-id', updateDto);

      expect(result.id).toBe('order-1');
      expect(result.status).toBe('out_for_delivery');
      expect(result.vendorId).toBe('vendor-id');
    });

    it('should throw NotFoundException if vendor not found', async () => {
      const updateDto = { status: 'out_for_delivery' as any };

      await expect(service.updateOrderStatus('order-1', 'non-existent-user', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVendorProducts', () => {
    it('should return vendor products', async () => {
      const vendor = {
        id: 'vendor-id',
        userId: 'user-id',
        businessName: 'Test Vendor',
        isActive: true,
        rating: 4.5,
        totalOrders: 100,
        deliveryZones: [
          {
            id: 'zone-1',
            vendorId: 'vendor-id',
            name: 'Zone 1',
            coordinates: [],
            deliveryFee: 15,
            minOrderAmount: 50,
            maxDeliveryTime: 60,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');

      const result = await service.getVendorProducts('user-id');

      expect(result).toHaveLength(1);
      expect(result[0].vendorId).toBe('vendor-id');
      expect(result[0].vendor.businessName).toBe('Test Vendor');
    });

    it('should throw NotFoundException if vendor not found', async () => {
      await expect(service.getVendorProducts('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProduct', () => {
    const vendor = {
      id: 'vendor-id',
      userId: 'user-id',
      businessName: 'Test Vendor',
      isActive: true,
      rating: 4.5,
      totalOrders: 100,
      deliveryZones: [
        {
          id: 'zone-1',
          vendorId: 'vendor-id',
          name: 'Zone 1',
          coordinates: [],
          deliveryFee: 15,
          minOrderAmount: 50,
          maxDeliveryTime: 60,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createProductDto = {
      name: 'New Product',
      description: 'New product description',
      category: 'water_jar' as any,
      size: '20L' as any,
      price: 25,
      depositAmount: 10,
      hasDeposit: true,
      stockQuantity: 50,
      images: ['/images/new.jpg'],
    };

    beforeEach(() => {
      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');
    });

    it('should create product successfully', async () => {
      const result = await service.createProduct('user-id', createProductDto);

      expect(result).toHaveProperty('id');
      expect(result.vendorId).toBe('vendor-id');
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(25);
      expect(result.specifications.capacity).toBe(20);
    });

    it('should throw NotFoundException if vendor not found', async () => {
      await expect(service.createProduct('non-existent-user', createProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProductStock', () => {
    const vendor = {
      id: 'vendor-id',
      userId: 'user-id',
      businessName: 'Test Vendor',
      isActive: true,
      rating: 4.5,
      totalOrders: 100,
      deliveryZones: [
        {
          id: 'zone-1',
          vendorId: 'vendor-id',
          name: 'Zone 1',
          coordinates: [],
          deliveryFee: 15,
          minOrderAmount: 50,
          maxDeliveryTime: 60,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).vendors.set('vendor-id', vendor);
      (service as any).userVendorIndex.set('user-id', 'vendor-id');
    });

    it('should update product stock successfully', async () => {
      const result = await service.updateProductStock('product-1', 'user-id', 75);

      expect(result.id).toBe('product-1');
      expect(result.vendorId).toBe('vendor-id');
      expect(result.stockQuantity).toBe(75);
    });

    it('should handle negative stock by setting to 0', async () => {
      const result = await service.updateProductStock('product-1', 'user-id', -10);

      expect(result.stockQuantity).toBe(0);
    });

    it('should throw NotFoundException if vendor not found', async () => {
      await expect(service.updateProductStock('product-1', 'non-existent-user', 50)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = (service as any).calculateDistance(28.6139, 77.209, 28.7041, 77.1025);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same coordinates', () => {
      const distance = (service as any).calculateDistance(28.6139, 77.209, 28.6139, 77.209);

      expect(distance).toBe(0);
    });
  });

  describe('toRadians', () => {
    it('should convert degrees to radians', () => {
      const radians = (service as any).toRadians(180);

      expect(radians).toBe(Math.PI);
    });

    it('should convert 0 degrees to 0 radians', () => {
      const radians = (service as any).toRadians(0);

      expect(radians).toBe(0);
    });
  });
});