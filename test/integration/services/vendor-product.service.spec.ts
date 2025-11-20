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
    vendorStore: { findFirst: jest.fn() },
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


  describe('createProductMapping - Conflict Scenarios', () => {
    it('should throw ConflictException when product mapping already exists', async () => {
      const createMappingDto = {
        store_id: '789',
        product_variant_id: '456',
        price: 150,
        stock: 50,
        area_pincodes: ['110001'],
      };

      // Mock store exists
      prismaService.vendorStore.findFirst.mockResolvedValue({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock product exists
      prismaService.product.findFirst.mockResolvedValue({
        id: BigInt(456),
        vendorId: BigInt(123),
        price: 100,
      } as any);

      // Mock existing mapping
      prismaService.productStoreMapping.findFirst.mockResolvedValue({
        id: BigInt(999),
        productId: BigInt(456),
        storeId: BigInt(789),
      } as any);

      await expect(
        service.createProductMapping(mockVendor, createMappingDto),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.productStoreMapping.create).not.toHaveBeenCalled();
    });

    it('should allow creating mapping when no existing mapping exists', async () => {
      const createMappingDto = {
        store_id: '789',
        product_variant_id: '456',
        price: 150,
        stock: 50,
        area_pincodes: ['110001'],
      };

      const product = {
        id: BigInt(456),
        vendorId: BigInt(123),
        name: 'Test Product',
        price: 100,
      };

      // Mock store exists
      prismaService.vendorStore.findFirst.mockResolvedValue({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock product exists
      prismaService.product.findFirst.mockResolvedValue(product as any);

      // Mock no existing mapping
      prismaService.productStoreMapping.findFirst.mockResolvedValue(null);

      // Mock create mapping
      const createdMapping = {
        id: BigInt(999),
        productId: BigInt(456),
        storeId: BigInt(789),
        price: 150,
        stockQuantity: 50,
        reservedStock: 0,
        isAvailable: true,
        areaPincodes: ['110001'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.productStoreMapping.create.mockResolvedValue(
        createdMapping as any,
      );

      const result = await service.createProductMapping(
        mockVendor,
        createMappingDto,
      );

      expect(result.product_id).toBe('456');
      expect(result.store_id).toBe('789');
      expect(result.price).toBe(150);
      expect(result.stock).toBe(50);
    });
  });

  describe('Error Response Structure Verification', () => {
    it('should throw standard NestJS exceptions that get converted by filter', async () => {
      const createProductDto = {
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
    it('should maintain existing error messages for ConflictException', async () => {
      const createMappingDto = {
        store_id: '789',
        product_variant_id: '456',
        price: 150,
        stock: 50,
        area_pincodes: ['110001'],
      };

      // Mock store exists
      prismaService.vendorStore.findFirst.mockResolvedValue({
        id: BigInt(789),
        vendorId: BigInt(123),
      } as any);

      // Mock product exists
      prismaService.product.findFirst.mockResolvedValue({
        id: BigInt(456),
        vendorId: BigInt(123),
        price: 100,
      } as any);

      // Mock existing mapping
      prismaService.productStoreMapping.findFirst.mockResolvedValue({
        id: BigInt(999),
        productId: BigInt(456),
        storeId: BigInt(789),
      } as any);

      try {
        await service.createProductMapping(mockVendor, createMappingDto);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('Product mapping already exists');
        expect(error.message).toContain('store');
      }
    });

    it('should handle undefined optional fields gracefully', async () => {
      const createProductDto = {
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

      const result = await service.createProduct(mockVendor, createProductDto);

      expect(result.title).toBe('Test Product');
      expect(result.attributes?.specifications?.sku).toBe('SKU123');
    });
  });
});
