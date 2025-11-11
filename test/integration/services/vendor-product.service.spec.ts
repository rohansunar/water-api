import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorProductService } from '../../../src/vendor/services/vendor-product.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { CustomLoggerService } from '../../../src/common/logger/logger.service';
import { VendorService } from '../../../src/vendor/services/vendor.service';
import { BusinessException, ConflictException as CustomConflictException } from '../../../src/common/exceptions/business.exception';

// Mock PrismaService methods
jest.mock('../../../src/common/database/prisma.service');

describe('VendorProductService - Conflict Scenarios', () => {
  let service: VendorProductService;
  let prismaService: jest.Mocked<PrismaService>;
  let customLogger: jest.Mocked<CustomLoggerService>;
  let vendorService: jest.Mocked<VendorService>;

  beforeEach(async () => {
    // Create mock functions for Prisma methods
    const mockVendorFindFirst = jest.fn();
    const mockProductFindFirst = jest.fn();
    const mockProductCreate = jest.fn();
    const mockProductUpdate = jest.fn();
    const mockProductCount = jest.fn();
    const mockProductFindMany = jest.fn();
    const mockProductStoreMappingFindFirst = jest.fn();
    const mockProductStoreMappingCreate = jest.fn();
    const mockProductStoreMappingUpdate = jest.fn();
    const mockProductStoreMappingCount = jest.fn();
    const mockProductStoreMappingFindMany = jest.fn();
    const mockVendorStoreFindFirst = jest.fn();

    // Mock the PrismaService
    (PrismaService as jest.MockedClass<typeof PrismaService>).mockImplementation(() => ({
      vendor: { findFirst: mockVendorFindFirst } as any,
      product: {
        findFirst: mockProductFindFirst,
        create: mockProductCreate,
        update: mockProductUpdate,
        count: mockProductCount,
        findMany: mockProductFindMany,
      } as any,
      productStoreMapping: {
        findFirst: mockProductStoreMappingFindFirst,
        create: mockProductStoreMappingCreate,
        update: mockProductStoreMappingUpdate,
        count: mockProductStoreMappingCount,
        findMany: mockProductStoreMappingFindMany,
      } as any,
      vendorStore: { findFirst: mockVendorStoreFindFirst } as any,
    } as any));

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
      const vendorId = '123';
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

      await expect(service.createProduct(vendorId, createProductDto))
        .rejects.toThrow(ConflictException);

      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_failure',
        {
          vendorId,
          productTitle: 'Existing Product',
          reason: 'product_name_exists'
        },
        vendorId,
      );
    });

    it('should throw ConflictException when creating product with duplicate name (case sensitive)', async () => {
      const vendorId = '123';
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

      await expect(service.createProduct(vendorId, createProductDto))
        .rejects.toThrow(ConflictException);

      expect(prismaService.product.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct - Conflict Scenarios', () => {
    it('should throw ConflictException when updating product name to existing name', async () => {
      const vendorId = '123';
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

      await expect(service.updateProduct(vendorId, productId, updateProductDto))
        .rejects.toThrow(ConflictException);

      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_update_failure',
        {
          vendorId,
          productId,
          reason: 'name_conflict'
        },
        vendorId,
      );
    });

    it('should allow updating product with same name (no change)', async () => {
      const vendorId = '123';
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
      prismaService.product.findFirst.mockResolvedValueOnce(existingProduct as any);

      // Mock name conflict check (should not find conflict since name is same)
      prismaService.product.findFirst.mockResolvedValueOnce(null);

      // Mock update
      const updatedProduct = { ...existingProduct, name: 'Same Product Name', description: 'Updated Description' };
      prismaService.product.update.mockResolvedValue(updatedProduct as any);

      const result = await service.updateProduct(vendorId, productId, updateProductDto);

      expect(result.title).toBe('Same Product Name');
      expect(prismaService.product.update).toHaveBeenCalled();
    });
  });

  describe('createProductVariant - Conflict Scenarios', () => {
    it('should throw ConflictException when variant SKU already exists', async () => {
      const vendorId = '123';
      const productId = '456';
      const createVariantDto = {
        variant_sku: 'EXISTING-SKU',
        attributes: { size: 'L', color: 'red' },
        price_override: 120,
      };

      const existingProduct = {
        id: BigInt(456),
        vendorId: BigInt(123),
        specifications: { sku: 'EXISTING-SKU' },
      };

      // Mock product exists
      prismaService.product.findFirst.mockResolvedValue(existingProduct as any);

      await expect(service.createProductVariant(vendorId, productId, createVariantDto))
        .rejects.toThrow(ConflictException);

      expect(prismaService.product.update).not.toHaveBeenCalled();
    });

    it('should allow creating variant when SKU is different', async () => {
      const vendorId = '123';
      const productId = '456';
      const createVariantDto = {
        variant_sku: 'NEW-SKU',
        attributes: { size: 'L', color: 'red' },
        price_override: 120,
      };

      const existingProduct = {
        id: BigInt(456),
        vendorId: BigInt(123),
        specifications: { sku: 'DIFFERENT-SKU' },
        price: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock product exists
      prismaService.product.findFirst.mockResolvedValue(existingProduct as any);

      // Mock update
      const updatedProduct = {
        ...existingProduct,
        specifications: { sku: 'NEW-SKU', size: 'L', color: 'red' },
        price: 120,
      };
      prismaService.product.update.mockResolvedValue(updatedProduct as any);

      const result = await service.createProductVariant(vendorId, productId, createVariantDto);

      expect(result.variant_sku).toBe('NEW-SKU');
      expect(result.attributes).toEqual({ sku: 'NEW-SKU', size: 'L', color: 'red' });
    });
  });

  describe('createProductMapping - Conflict Scenarios', () => {
    it('should throw ConflictException when product mapping already exists', async () => {
      const vendorId = '123';
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

      await expect(service.createProductMapping(vendorId, createMappingDto))
        .rejects.toThrow(ConflictException);

      expect(prismaService.productStoreMapping.create).not.toHaveBeenCalled();
    });

    it('should allow creating mapping when no existing mapping exists', async () => {
      const vendorId = '123';
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
      prismaService.productStoreMapping.create.mockResolvedValue(createdMapping as any);

      const result = await service.createProductMapping(vendorId, createMappingDto);

      expect(result.product_id).toBe('456');
      expect(result.store_id).toBe('789');
      expect(result.price).toBe(150);
      expect(result.stock).toBe(50);
    });
  });

  describe('Error Response Structure Verification', () => {
    it('should throw standard NestJS exceptions that get converted by filter', async () => {
      const vendorId = '123';
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

      await expect(service.createProduct(vendorId, createProductDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException with proper message', async () => {
      const vendorId = '123';
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
        await service.createProduct(vendorId, createProductDto);
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
      const vendorId = '123';
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
        await service.createProductMapping(vendorId, createMappingDto);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('Product mapping already exists');
        expect(error.message).toContain('store');
      }
    });

    it('should handle undefined optional fields gracefully', async () => {
      const vendorId = '123';
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

      const result = await service.createProduct(vendorId, createProductDto);

      expect(result.title).toBe('Test Product');
      expect(result.attributes?.specifications?.sku).toBe('SKU123');
    });
  });
});