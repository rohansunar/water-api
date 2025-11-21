import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VendorProductService } from '../../../src/vendor/services/vendor-product.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { CustomLoggerService } from '../../../src/common/logger/logger.service';
import { VendorService } from '../../../src/vendor/services/vendor.service';
import {
  BusinessException,
  ConflictException as CustomConflictException,
} from '../../../src/common/exceptions/business.exception';
import { Vendor } from '../../../src/vendor/interfaces/vendor.interface';

// Mock PrismaService methods
jest.mock('../../../src/common/database/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    vendor: { findFirst: jest.fn() },
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    productStoreMapping: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    store: { findFirst: jest.fn() },
  })),
}));

describe('VendorProductService - Conflict Scenarios', () => {
  let service: VendorProductService;
  let prismaService: any;
  let customLogger: jest.Mocked<CustomLoggerService>;
  let vendorService: jest.Mocked<VendorService>;

  const mockVendor: Vendor = {
    id: '123',
    userId: 'user-123',
    businessName: 'Test Vendor',
    businessAddress: 'Test Address',
    approvalStatus: 'approved',
    bankAccounts: [],
    deliveryZones: [],
    isActive: true,
    rating: 4.5,
    totalOrders: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCustomLogger = {
      logBusinessEvent: jest.fn(),
    };

    const mockVendorService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorProductService,
        PrismaService,
        {
          provide: CustomLoggerService,
          useValue: mockCustomLogger,
        },
        {
          provide: VendorService,
          useValue: mockVendorService,
        },
      ],
    }).compile();

    service = module.get<VendorProductService>(VendorProductService);
    prismaService = module.get(PrismaService);
    customLogger = module.get(CustomLoggerService);
    vendorService = module.get(VendorService);
  });

  describe('createProduct - Conflict Scenarios', () => {
    it('should throw ConflictException when product name already exists for vendor', async () => {
      const createProductDto = {
        storeId: '789',
        title: 'Existing Product',
        sku: 'SKU123',
        description: 'Description',
        category: 'Category',
        attributes: {},
        base_price: 100,
        unit: 'kg',
      };

      // Mock vendor exists and is active
      prismaService.vendor.findFirst.mockResolvedValueOnce({
        id: BigInt(123),
        isActive: true,
      } as any);

      // Mock store exists and belongs to vendor
      prismaService.store.findFirst.mockResolvedValueOnce({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock existing product with same name
      prismaService.product.findFirst.mockResolvedValueOnce({
        id: BigInt(456),
        name: 'Existing Product',
      } as any);

      await expect(
        service.createProduct(mockVendor, createProductDto),
      ).rejects.toThrow(ConflictException);

      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_failure',
        {
          vendorId: mockVendor.id,
          productTitle: 'Existing Product',
          reason: 'product_name_exists',
        },
        mockVendor.id,
      );
    });

    it('should throw ConflictException when creating product with duplicate name (case sensitive)', async () => {
      const createProductDto = {
        storeId: '789',
        title: 'existing product',
        sku: 'SKU123',
        description: 'Description',
        category: 'Category',
        attributes: {},
        base_price: 100,
        unit: 'kg',
      };

      // Mock vendor exists and is active
      prismaService.vendor.findFirst.mockResolvedValueOnce({
        id: BigInt(123),
        isActive: true,
      } as any);

      // Mock store exists and belongs to vendor
      prismaService.store.findFirst.mockResolvedValueOnce({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock existing product with different case
      prismaService.product.findFirst.mockResolvedValueOnce({
        id: BigInt(456),
        name: 'Existing Product',
      } as any);

      await expect(
        service.createProduct(mockVendor, createProductDto),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.product.create).not.toHaveBeenCalled();
    });
  
    describe('createProduct - Store Validation', () => {
      it('should throw BadRequestException when storeId is missing', async () => {
        const invalidDto = {
          title: 'Test Product',
          sku: 'SKU123',
          description: 'Description',
          category: 'Category',
          attributes: {},
          base_price: 100,
          unit: 'kg',
        } as any; // Cast to bypass TypeScript check for testing

        // Mock vendor exists and is active
        prismaService.vendor.findFirst.mockResolvedValueOnce({
          id: BigInt(123),
          isActive: true,
        } as any);

        await expect(
          service.createProduct(mockVendor, invalidDto),
        ).rejects.toThrow(BadRequestException);
      });
  
      it('should throw NotFoundException when store does not exist', async () => {
        const createProductDto = {
          storeId: '999',
          title: 'Test Product',
          sku: 'SKU123',
          description: 'Description',
          category: 'Category',
          attributes: {},
          base_price: 100,
          unit: 'kg',
        };
  
        // Mock vendor exists and is active
        prismaService.vendor.findFirst.mockResolvedValueOnce({
          id: BigInt(123),
          isActive: true,
        } as any);
  
        // Mock store not found
        prismaService.store.findFirst.mockResolvedValueOnce(null);
  
        await expect(
          service.createProduct(mockVendor, createProductDto),
        ).rejects.toThrow(NotFoundException);
  
        expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
          'product_creation_failure',
          {
            vendorId: mockVendor.id,
            storeId: '999',
            reason: 'store_not_found_or_not_owned',
          },
          mockVendor.id,
        );
      });
  
      it('should throw NotFoundException when store does not belong to vendor', async () => {
        const createProductDto = {
          storeId: '999',
          title: 'Test Product',
          sku: 'SKU123',
          description: 'Description',
          category: 'Category',
          attributes: {},
          base_price: 100,
          unit: 'kg',
        };
  
        // Mock vendor exists and is active
        prismaService.vendor.findFirst.mockResolvedValueOnce({
          id: BigInt(123),
          isActive: true,
        } as any);
  
        // Mock store exists but belongs to different vendor
        prismaService.store.findFirst.mockResolvedValueOnce({
          id: BigInt(999),
          vendorId: BigInt(456), // Different vendor
        } as any);
  
        await expect(
          service.createProduct(mockVendor, createProductDto),
        ).rejects.toThrow(NotFoundException);
  
        expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
          'product_creation_failure',
          {
            vendorId: mockVendor.id,
            storeId: '999',
            reason: 'store_not_found_or_not_owned',
          },
          mockVendor.id,
        );
      });
  
      it('should successfully create product with valid storeId', async () => {
        const createProductDto = {
          storeId: '789',
          title: 'New Product',
          sku: 'SKU123',
          description: 'Description',
          category: 'Category',
          attributes: { specifications: { brand: 'TestBrand' } },
          base_price: 100,
          unit: 'kg',
        };
  
        // Mock vendor exists and is active
        prismaService.vendor.findFirst.mockResolvedValueOnce({
          id: BigInt(123),
          isActive: true,
        } as any);
  
        // Mock store exists and belongs to vendor
        prismaService.store.findFirst.mockResolvedValueOnce({
          id: BigInt(789),
          vendorId: BigInt(123),
        } as any);
  
        // Mock no existing product
        prismaService.product.findFirst.mockResolvedValueOnce(null);
  
        // Mock product creation
        const createdProduct = {
          id: BigInt(999),
          vendorId: BigInt(123),
          name: 'New Product',
          category: 'Category',
          price: 100,
          description: 'Description',
          capacity: 'kg',
          unit: 'kg',
          stock: 0,
          stockQuantity: 0,
          isAvailable: true,
          minOrderQuantity: 1,
          maxOrderQuantity: 1000,
          areaPincodes: [],
          images: [],
          specifications: { sku: 'SKU123', brand: 'TestBrand' },
          hasDeposit: false,
          depositAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prismaService.product.create.mockResolvedValue(createdProduct as any);
  
        // Mock product-store mapping creation
        const createdMapping = {
          id: BigInt(1000),
          productId: BigInt(999),
          storeId: BigInt(789),
          price: 100,
          stockQuantity: 0,
          isAvailable: true,
        };
        prismaService.productStoreMapping.create.mockResolvedValue(createdMapping as any);
  
        const result = await service.createProduct(mockVendor, createProductDto);
  
        expect(result).toBeDefined();
        expect(result.id).toBe('999');
        expect(result.title).toBe('New Product');
        expect(result.base_price).toBe(100);
  
        // Verify product creation was called with correct data
        expect(prismaService.product.create).toHaveBeenCalledWith({
          data: {
            vendorId: BigInt(123),
            name: 'New Product',
            category: 'Category',
            price: 100,
            description: 'Description',
            capacity: 'kg',
            unit: 'kg',
            stock: 0,
            stockQuantity: 0,
            isAvailable: true,
            minOrderQuantity: 1,
            maxOrderQuantity: 1000,
            areaPincodes: [],
            images: [],
            specifications: {
              sku: 'SKU123',
              brand: 'TestBrand',
            },
            hasDeposit: false,
            depositAmount: 0,
          },
        });
  
        // Verify product-store mapping creation
        expect(prismaService.productStoreMapping.create).toHaveBeenCalledWith({
          data: {
            productId: BigInt(999),
            storeId: BigInt(789),
            price: 100,
            stockQuantity: 0,
            isAvailable: true,
          },
        });
  
        // Verify logging
        expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
          'product_created',
          {
            vendorId: mockVendor.id,
            productId: '999',
            productTitle: 'New Product',
          },
          mockVendor.id,
        );
      });
    });
  });

  describe('updateProduct - Conflict Scenarios', () => {
    it('should throw ConflictException when updating product name to existing name', async () => {
      const productId = '456';
      const updateProductDto = {
        title: 'New Product Name',
        sku: 'SKU123',
        description: 'Updated Description',
        category: 'Category',
        attributes: {},
        base_price: 150,
        unit: 'kg',
        is_active: true,
      };

      // Mock existing product
      prismaService.product.findFirst
        .mockResolvedValueOnce({
          id: BigInt(456),
          vendorId: BigInt(123),
          name: 'Old Product Name',
        } as any)
        .mockResolvedValueOnce({
          id: BigInt(789),
          name: 'New Product Name',
        } as any);

      await expect(
        service.updateProduct(mockVendor, productId, updateProductDto),
      ).rejects.toThrow(ConflictException);

      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_update_failure',
        {
          vendorId: mockVendor.id,
          productId,
          reason: 'name_conflict',
        },
        mockVendor.id,
      );
    });

    it('should allow updating product with same name (no change)', async () => {
      const productId = '456';
      const updateProductDto = {
        title: 'Same Product Name',
        sku: 'SKU123',
        description: 'Updated Description',
        category: 'Category',
        attributes: {},
        base_price: 150,
        unit: 'kg',
        is_active: true,
      };

      const existingProduct = {
        id: BigInt(456),
        vendorId: BigInt(123),
        name: 'Same Product Name',
        category: 'Old Category',
        price: 100,
        description: 'Old Description',
        capacity: 'old_unit',
        images: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock existing product
      prismaService.product.findFirst.mockResolvedValueOnce(
        existingProduct as any,
      );

      // Mock name conflict check (should not find conflict since name is same)
      prismaService.product.findFirst.mockResolvedValueOnce(null);

      // Mock update
      const updatedProduct = {
        ...existingProduct,
        name: 'Same Product Name',
        description: 'Updated Description',
      };
      prismaService.product.update.mockResolvedValue(updatedProduct as any);

      const result = await service.updateProduct(
        mockVendor,
        productId,
        updateProductDto,
      );

      expect(result.title).toBe('Same Product Name');
      expect(prismaService.product.update).toHaveBeenCalled();
    });
  });



  describe('Error Response Structure Verification', () => {
    it('should throw standard NestJS exceptions that get converted by filter', async () => {
      const createProductDto = {
        storeId: '789',
        title: 'Test Product',
        sku: 'SKU123',
        description: 'Description',
        category: 'Category',
        attributes: {},
        base_price: 100,
        unit: 'kg',
      };

      // Mock vendor not found
      prismaService.vendor.findFirst.mockResolvedValue(null);

      await expect(
        service.createProduct(mockVendor, createProductDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException with proper message', async () => {
      const createProductDto = {
        storeId: '789',
        title: 'Existing Product',
        sku: 'SKU123',
        description: 'Description',
        category: 'Category',
        attributes: {},
        base_price: 100,
        unit: 'kg',
      };

      // Mock vendor exists and is active
      prismaService.vendor.findFirst.mockResolvedValueOnce({
        id: BigInt(123),
        isActive: true,
      } as any);

      // Mock store exists and belongs to vendor
      prismaService.store.findFirst.mockResolvedValueOnce({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock existing product
      prismaService.product.findFirst.mockResolvedValueOnce({
        id: BigInt(456),
        name: 'Existing Product',
      } as any);

      try {
        await service.createProduct(mockVendor, createProductDto);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('Product with name');
        expect(error.message).toContain('already exists');
      }
    });
  });

  describe('Backward Compatibility', () => {

    it('should handle undefined optional fields gracefully', async () => {
      const createProductDto = {
        storeId: '789',
        title: 'Test Product',
        sku: 'SKU123',
        description: 'Description',
        category: 'Category',
        attributes: undefined,
        base_price: 100,
        unit: 'kg',
      };

      // Mock vendor exists and is active
      prismaService.vendor.findFirst.mockResolvedValueOnce({
        id: BigInt(123),
        isActive: true,
      } as any);

      // Mock store exists and belongs to vendor
      prismaService.store.findFirst.mockResolvedValueOnce({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock no existing product
      prismaService.product.findFirst.mockResolvedValueOnce(null);

      // Mock successful creation
      const createdProduct = {
        id: BigInt(999),
        vendorId: BigInt(123),
        name: 'Test Product',
        category: 'Category',
        price: 100,
        description: 'Description',
        capacity: 'kg',
        unit: 'kg',
        stock: 0,
        stockQuantity: 0,
        isAvailable: true,
        minOrderQuantity: 1,
        maxOrderQuantity: 1000,
        areaPincodes: [],
        images: [],
        specifications: { sku: 'SKU123' },
        hasDeposit: false,
        depositAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.product.create.mockResolvedValue(createdProduct as any);

      // Mock product-store mapping creation
      prismaService.productStoreMapping.create.mockResolvedValue({
        id: BigInt(1000),
        productId: BigInt(999),
        storeId: BigInt(789),
        price: 100,
        stockQuantity: 0,
        isAvailable: true,
      } as any);

      const result = await service.createProduct(mockVendor, createProductDto);

      expect(result.title).toBe('Test Product');
      expect(result.attributes?.specifications?.sku).toBe('SKU123');
    });
  });
});
