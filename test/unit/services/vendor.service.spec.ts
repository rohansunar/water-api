import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VendorService } from '../../../src/vendor/services/vendor.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { Vendor } from '../../../src/vendor/interfaces/vendor.interface';
import { ProductCategory, ProductSize } from '../../../src/product/interfaces/product.interface';

// Mock PrismaService methods
jest.mock('../../../src/common/database/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    vendor: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    productStoreMapping: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    vendorStore: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
  })),
}));

describe('VendorService', () => {
  let service: VendorService;
  let prismaService: any;

  const mockVendor: Vendor = {
    id: '123',
    userId: 'user-123',
    businessName: 'Test Vendor',
    businessAddress: 'Test Address',
    businessPhone: '1234567890',
    businessEmail: 'test@vendor.com',
    gstNumber: 'GST123456',
    licenseNumber: 'LIC123',
    documents: {},
    approvalStatus: 'approved',
    rejectionReason: undefined,
    bankAccounts: [],
    deliveryZones: [],
    isActive: true,
    rating: 4.5,
    totalOrders: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        PrismaService,
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return vendor when found', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: '1234567890',
        email: 'test@vendor.com',
        isActive: true,
        kycStatus: 'verified',
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        stores: [],
        addresses: [],
      };

      prismaService.vendor.findUnique.mockResolvedValue(prismaVendor);

      const result = await service.findById('123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(result?.businessName).toBe('Test Vendor');
      expect(prismaService.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(123) },
        include: {
          stores: true,
          addresses: true,
        },
      });
    });

    it('should return null when vendor not found', async () => {
      prismaService.vendor.findUnique.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      prismaService.vendor.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.findById('123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return vendor when found by phone', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: 'user-123',
        email: 'test@vendor.com',
        isActive: true,
        kycStatus: 'verified',
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        stores: [],
        addresses: [],
      };

      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      const result = await service.findByUserId('user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      expect(result?.businessName).toBe('Test Vendor');
    });

    it('should return vendor when found by email', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: '1234567890',
        email: 'user-123',
        isActive: true,
        kycStatus: 'verified',
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        stores: [],
        addresses: [],
      };

      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      const result = await service.findByUserId('user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('should return null when vendor not found', async () => {
      prismaService.vendor.findFirst.mockResolvedValue(null);

      const result = await service.findByUserId('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      prismaService.vendor.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await service.findByUserId('user-123');

      expect(result).toBeNull();
    });
  });

  describe('findByLocation', () => {
    it('should return vendors with products in area', async () => {
      const prismaVendors = [
        {
          id: BigInt(123),
          name: 'Test Vendor',
          phone: '1234567890',
          email: 'test@vendor.com',
          isActive: true,
          kycStatus: 'verified',
          rating: 4.5,
          createdAt: new Date(),
          updatedAt: new Date(),
          stores: [],
          addresses: [],
          products: [
            {
              areaPincodes: ['110001', '110002'],
            },
          ],
        },
      ];

      prismaService.vendor.findMany.mockResolvedValue(prismaVendors);

      const result = await service.findByLocation(28.6139, 77.2090);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].businessName).toBe('Test Vendor');
    });

    it('should return empty array when no vendors found', async () => {
      prismaService.vendor.findMany.mockResolvedValue([]);

      const result = await service.findByLocation(28.6139, 77.2090);

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      prismaService.vendor.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.findByLocation(28.6139, 77.2090);

      expect(result).toEqual([]);
    });
  });

  describe('getAllVendors', () => {
    it('should return all active vendors', async () => {
      const prismaVendors = [
        {
          id: BigInt(123),
          name: 'Test Vendor 1',
          phone: '1234567890',
          email: 'test1@vendor.com',
          isActive: true,
          kycStatus: 'verified',
          rating: 4.5,
          createdAt: new Date(),
          updatedAt: new Date(),
          stores: [],
          addresses: [],
        },
        {
          id: BigInt(124),
          name: 'Test Vendor 2',
          phone: '0987654321',
          email: 'test2@vendor.com',
          isActive: true,
          kycStatus: 'verified',
          rating: 4.0,
          createdAt: new Date(),
          updatedAt: new Date(),
          stores: [],
          addresses: [],
        },
      ];

      prismaService.vendor.findMany.mockResolvedValue(prismaVendors);

      const result = await service.getAllVendors();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('123');
      expect(result[1].id).toBe('124');
    });

    it('should throw error on database failure', async () => {
      prismaService.vendor.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllVendors()).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new vendor successfully', async () => {
      const userId = 'user-123';
      const businessName = 'New Vendor';

      const createdPrismaVendor = {
        id: BigInt(123),
        name: businessName,
        phone: userId,
        email: null,
        kycStatus: 'pending',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        stores: [],
        addresses: [],
      };

      prismaService.vendor.create.mockResolvedValue(createdPrismaVendor);

      const result = await service.create(userId, businessName);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
      expect(result.businessName).toBe(businessName);
      expect(result.userId).toBe(userId);
      expect(result.approvalStatus).toBe('pending_approval');
      expect(result.isActive).toBe(true);

      expect(prismaService.vendor.create).toHaveBeenCalledWith({
        data: {
          name: businessName,
          phone: userId,
          kycStatus: 'pending',
          isActive: true,
        },
        include: {
          stores: true,
          addresses: true,
        },
      });
    });

    it('should throw error on database failure', async () => {
      prismaService.vendor.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create('user-123', 'Test Vendor')).rejects.toThrow('Database error');
    });
  });

  describe('getVendorProducts', () => {
    it('should return vendor products successfully', async () => {
      const userId = 'user-123';

      // Mock vendor lookup
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: userId,
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      // Mock products
      const prismaProducts = [
        {
          id: BigInt(456),
          name: 'Test Product',
          description: 'Product description',
          category: 'Test Category',
          capacity: '10L',
          unit: 'liter',
          price: 100,
          depositAmount: 10,
          hasDeposit: true,
          stockQuantity: 50,
          images: ['image1.jpg'],
          specifications: {
            capacity: 10,
            material: 'Plastic',
            brand: 'Generic',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeMappings: [
            {
              store: {
                id: BigInt(789),
                name: 'Test Store',
              },
            },
          ],
        },
      ];

      prismaService.product.findMany.mockResolvedValue(prismaProducts);

      const result = await service.getVendorProducts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('456');
      expect(result[0].name).toBe('Test Product');
      expect(result[0].price).toBe(100);
      expect(result[0].stockQuantity).toBe(50);
    });

    it('should throw NotFoundException when vendor not found', async () => {
      prismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(service.getVendorProducts('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: 'user-123',
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);
      prismaService.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getVendorProducts('user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const userId = 'user-123';
      const createProductDto = {
        name: 'New Product',
        description: 'Product description',
        category: ProductCategory.WATER_JAR,
        size: ProductSize.SMALL,
        price: 100,
        depositAmount: 10,
        hasDeposit: true,
        stockQuantity: 50,
        images: ['image1.jpg'],
      };

      // Mock vendor lookup
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: userId,
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      // Mock product creation
      const createdProduct = {
        id: BigInt(456),
        vendorId: BigInt(123),
        name: 'New Product',
        description: 'Product description',
        category: 'Test Category',
        capacity: '10L',
        unit: 'liter',
        price: 100,
        depositAmount: 10,
        hasDeposit: true,
        stockQuantity: 50,
        images: ['image1.jpg'],
        specifications: {
          capacity: 10,
          material: 'Plastic',
          brand: 'Generic',
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        storeMappings: [],
      };

      prismaService.product.create.mockResolvedValue(createdProduct);

      const result = await service.createProduct(userId, createProductDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('456');
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(100);
      expect(result.stockQuantity).toBe(50);
    });

    it('should throw NotFoundException when vendor not found', async () => {
      const createProductDto = {
        name: 'New Product',
        description: 'Product description',
        category: ProductCategory.WATER_JAR,
        size: ProductSize.SMALL,
        price: 100,
        depositAmount: 10,
        hasDeposit: true,
        stockQuantity: 50,
        images: ['image1.jpg'],
      };

      prismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(service.createProduct('nonexistent', createProductDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      const createProductDto = {
        name: 'New Product',
        description: 'Product description',
        category: ProductCategory.WATER_JAR,
        size: ProductSize.SMALL,
        price: 100,
        depositAmount: 10,
        hasDeposit: true,
        stockQuantity: 50,
        images: ['image1.jpg'],
      };

      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: 'user-123',
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);
      prismaService.product.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createProduct('user-123', createProductDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock successfully', async () => {
      const productId = '456';
      const userId = 'user-123';
      const quantity = 75;

      // Mock vendor lookup
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: userId,
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      // Mock product update
      const updatedProduct = {
        id: BigInt(456),
        vendorId: BigInt(123),
        name: 'Test Product',
        stockQuantity: 75,
        updatedAt: new Date(),
        storeMappings: [],
      };

      prismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateProductStock(productId, userId, quantity);

      expect(result).toBeDefined();
      expect(result.id).toBe('456');
      expect(result.stockQuantity).toBe(75);
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: {
          id: BigInt(456),
          vendorId: BigInt(123),
        },
        data: {
          stockQuantity: 75,
          updatedAt: expect.any(Date),
        },
        include: {
          storeMappings: {
            include: {
              store: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when vendor not found', async () => {
      prismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(service.updateProductStock('456', 'nonexistent', 50)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product not found', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: 'user-123',
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);
      prismaService.product.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.updateProductStock('999', 'user-123', 50)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStoreDetails', () => {
    it('should return store details successfully', async () => {
      const userId = 'user-123';

      // Mock vendor lookup
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: userId,
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);

      // Mock store lookup
      const prismaStore = {
        id: BigInt(789),
        name: 'Test Store',
        address: 'Test Address',
        phone: '1234567890',
        activeHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.vendorStore.findFirst.mockResolvedValue(prismaStore);

      const result = await service.getStoreDetails(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('789');
      expect(result.name).toBe('Test Store');
      expect(result.address).toBe('Test Address');
      expect(result.is_active).toBe(true);
    });

    it('should throw NotFoundException when vendor not found', async () => {
      prismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(service.getStoreDetails('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when store not found', async () => {
      const prismaVendor = {
        id: BigInt(123),
        name: 'Test Vendor',
        phone: 'user-123',
        isActive: true,
      };
      prismaService.vendor.findFirst.mockResolvedValue(prismaVendor);
      prismaService.vendorStore.findFirst.mockResolvedValue(null);

      await expect(service.getStoreDetails('user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVendorOrders', () => {
    it('should return vendor orders successfully', async () => {
      const prismaOrders = [
        {
          orderUuid: 'order-123',
          totalAmount: 150,
          status: 'confirmed',
          scheduledDelivery: null,
          paymentMethod: 'card',
          paymentStatus: 'paid',
          createdAt: new Date(),
          updatedAt: new Date(),
          customer: {
            uuid: 'customer-123',
            name: 'Test Customer',
            phone: '9876543210',
          },
          address: {
            street: 'Test Street',
            city: 'Test City',
            state: 'Test State',
            pincode: '110001',
            latitude: 28.6139,
            longitude: 77.2090,
          },
          items: [
            {
              quantity: 2,
              totalPrice: 150,
              product: {
                id: BigInt(456),
                name: 'Test Product',
              },
            },
          ],
        },
      ];

      prismaService.order.findMany.mockResolvedValue(prismaOrders);

      const result = await service.getVendorOrders(mockVendor);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-123');
      expect(result[0].totalAmount).toBe(150);
      expect(result[0].status).toBe('confirmed');
    });

    it('should throw BadRequestException on database error', async () => {
      prismaService.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getVendorOrders(mockVendor)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123';
      const updateOrderStatusDto = { status: 'preparing' };

      // Mock order lookup
      const existingOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        vendorId: BigInt(123),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { uuid: 'customer-123', name: 'Test Customer' },
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '110001',
        },
        items: [
          {
            quantity: 2,
            product: { id: BigInt(456), name: 'Test Product' },
          },
        ],
      };

      prismaService.order.findFirst.mockResolvedValue(existingOrder);

      // Mock order update
      const updatedOrder = {
        ...existingOrder,
        status: 'preparing',
        updatedAt: new Date(),
      };

      prismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderStatus(orderId, mockVendor, updateOrderStatusDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(orderId);
      expect(result.status).toBe('preparing');
    });

    it('should throw NotFoundException when order not found', async () => {
      const updateOrderStatusDto = { status: 'preparing' };

      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.updateOrderStatus('nonexistent', mockVendor, updateOrderStatusDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      const updateOrderStatusDto = { status: 'preparing' };

      const existingOrder = {
        id: BigInt(789),
        orderUuid: 'order-123',
        vendorId: BigInt(123),
        status: 'confirmed',
      };

      prismaService.order.findFirst.mockResolvedValue(existingOrder);
      prismaService.order.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateOrderStatus('order-123', mockVendor, updateOrderStatusDto)).rejects.toThrow(BadRequestException);
    });
  });
});