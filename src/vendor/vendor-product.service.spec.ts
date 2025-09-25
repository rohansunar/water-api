import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { VendorProductService } from './vendor-product.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { VendorService } from './vendor.service';
import { Product, ProductDocument } from '../common/schemas/product.schema';
import { VendorStore, VendorStoreDocument } from '../common/schemas/vendor-store.schema';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  CreateVendorProductVariantDto,
  UpdateVendorProductVariantDto,
  CreateVendorProductMappingDto,
  UpdateVendorProductMappingDto,
  VendorProductResponseDto,
  VendorProductVariantResponseDto,
  VendorProductMappingResponseDto,
} from '../common/dto/vendor.dto';

describe('VendorProductService', () => {
  let service: VendorProductService;
  let productModel: jest.Mocked<Model<ProductDocument>>;
  let storeModel: jest.Mocked<Model<VendorStoreDocument>>;
  let customLogger: jest.Mocked<CustomLoggerService>;
  let vendorService: jest.Mocked<VendorService>;

  const mockVendorId = 'vendor-123';
  const mockProductId = 'product-456';
  const mockStoreId = 'store-789';
  const mockVariantId = 'variant-101';

  const mockVendor = {
    id: mockVendorId,
    userId: 'user-123',
    businessName: 'Test Vendor',
    businessAddress: '123 Test Street',
    approvalStatus: 'approved' as const,
    bankAccounts: [],
    deliveryZones: [],
    isActive: true,
    rating: 4.5,
    totalOrders: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStore = {
    _id: mockStoreId,
    vendorId: mockVendorId,
    name: 'Test Store',
    address: '123 Test Street',
    isActive: true,
  };

  const mockProduct = {
    _id: mockProductId,
    vendorId: mockVendorId,
    name: 'Test Product',
    category: 'water_jar',
    price: 50,
    description: 'Test description',
    capacity: '20L',
    stock: 0,
    stockQuantity: 0,
    isAvailable: true,
    isActive: true,
    minOrderQuantity: 1,
    maxOrderQuantity: 1000,
    areaPincodes: [],
    images: [],
    specifications: {},
    hasDeposit: false,
    depositAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductWithVariant = {
    ...mockProduct,
    specifications: { sku: 'VARIANT-SKU-001', type: 'mineral' },
    price: 55,
  };

  const mockProductWithMapping = {
    ...mockProduct,
    storeMappings: [
      {
        storeId: mockStoreId,
        price: 50,
        stockQuantity: 100,
        reservedStock: 0,
        isAvailable: true,
        areaPincodes: ['110001'],
      },
    ],
  };

  const mockCreateProductDto: CreateVendorProductDto = {
    title: 'Premium Mineral Water 20L',
    sku: 'PW-20L-001',
    description: 'Premium quality mineral water',
    category: 'water_jar',
    attributes: {
      specifications: { type: 'mineral', brand: 'AquaPure' },
      hasDeposit: true,
      depositAmount: 75,
    },
    base_price: 50,
    unit: 'liter',
  };

  const mockUpdateProductDto: UpdateVendorProductDto = {
    title: 'Updated Product Name',
    base_price: 55,
    is_active: true,
  };

  const mockCreateVariantDto: CreateVendorProductVariantDto = {
    variant_sku: 'PW-20L-MINERAL-001',
    attributes: { type: 'mineral', brand: 'AquaPure' },
    price_override: 55,
  };

  const mockUpdateVariantDto: UpdateVendorProductVariantDto = {
    attributes: { type: 'premium' },
    price_override: 60,
    is_active: true,
  };

  const mockCreateMappingDto: CreateVendorProductMappingDto = {
    store_id: mockStoreId,
    product_variant_id: mockProductId,
    price: 50,
    stock: 100,
    area_pincodes: ['110001', '110002'],
  };

  const mockUpdateMappingDto: UpdateVendorProductMappingDto = {
    price: 55,
    stock: 150,
    area_pincodes: ['110001', '110002', '110003'],
    is_active: true,
  };

  beforeEach(async () => {
    const mockProductModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockStoreModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockCustomLoggerService = {
      logBusinessEvent: jest.fn(),
      logDatabaseOperation: jest.fn(),
      logError: jest.fn(),
    };

    const mockVendorService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorProductService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(VendorStore.name),
          useValue: mockStoreModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
        {
          provide: VendorService,
          useValue: mockVendorService,
        },
      ],
    }).compile();

    service = module.get<VendorProductService>(VendorProductService);
    productModel = module.get(getModelToken(Product.name));
    storeModel = module.get(getModelToken(VendorStore.name));
    customLogger = module.get(CustomLoggerService);
    vendorService = module.get(VendorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      // Arrange
      const expectedProduct = { ...mockProduct, ...mockCreateProductDto };
      vendorService.findById.mockResolvedValue(mockVendor);
      productModel.create.mockResolvedValue(expectedProduct as any);

      // Act
      const result = await service.createProduct(mockVendorId, mockCreateProductDto);

      // Assert
      expect(vendorService.findById).toHaveBeenCalledWith(mockVendorId);
      expect(productModel.create).toHaveBeenCalledWith({
        vendorId: mockVendorId,
        name: mockCreateProductDto.title,
        category: mockCreateProductDto.category,
        price: mockCreateProductDto.base_price,
        description: mockCreateProductDto.description,
        capacity: mockCreateProductDto.unit,
        stock: 0,
        stockQuantity: 0,
        isAvailable: true,
        isActive: true,
        minOrderQuantity: 1,
        maxOrderQuantity: 1000,
        areaPincodes: mockCreateProductDto.attributes?.areaPincodes || [],
        images: mockCreateProductDto.attributes?.images || [],
        specifications: mockCreateProductDto.attributes?.specifications || {},
        hasDeposit: mockCreateProductDto.attributes?.hasDeposit || false,
        depositAmount: mockCreateProductDto.attributes?.depositAmount || 0,
      });
      expect(result).toEqual(expectedProduct);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_attempt',
        { vendorId: mockVendorId, productTitle: mockCreateProductDto.title, sku: mockCreateProductDto.sku },
        mockVendorId,
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_created',
        { vendorId: mockVendorId, productId: mockProductId, productTitle: mockCreateProductDto.title },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when vendor not found', async () => {
      // Arrange
      vendorService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        'Vendor not found',
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_failure',
        { vendorId: mockVendorId, reason: 'vendor_not_found' },
        mockVendorId,
      );
    });

    it('should throw ConflictException when product name already exists', async () => {
      // Arrange
      vendorService.findById.mockResolvedValue(mockVendor);
      productModel.findOne.mockResolvedValue(mockProduct);

      // Act & Assert
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        'Product with this name already exists for this vendor',
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_failure',
        { vendorId: mockVendorId, productTitle: mockCreateProductDto.title, reason: 'product_name_exists' },
        mockVendorId,
      );
    });

    it('should throw BadRequestException when creation fails', async () => {
      // Arrange
      const dbError = new Error('Database error');
      vendorService.findById.mockResolvedValue(mockVendor);
      productModel.findOne.mockResolvedValue(null);
      productModel.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createProduct(mockVendorId, mockCreateProductDto)).rejects.toThrow(
        'Product creation failed',
      );
    });
  });

  describe('getProducts', () => {
    it('should return products with pagination', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const query = { vendorId: mockVendorId, isActive: true };
      const options = { skip: 0, limit: 10, sort: { createdAt: -1 } };

      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      } as any);

      productModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getProducts(mockVendorId, 1, 10, true);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith(query);
      expect(productModel.countDocuments).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'products_retrieved',
        { vendorId: mockVendorId, count: 1, page: 1, limit: 10 },
        mockVendorId,
      );
    });

    it('should return all products when isActive is undefined', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const query = { vendorId: mockVendorId };

      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      } as any);

      productModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getProducts(mockVendorId, 1, 10);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith(query);
      expect(result.products).toEqual(mockProducts);
    });

    it('should handle empty results', async () => {
      // Arrange
      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      productModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.getProducts(mockVendorId, 1, 10, true);

      // Assert
      expect(result).toEqual({
        products: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(mockProduct);

      // Act
      const result = await service.getProductById(mockVendorId, mockProductId);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(result).toEqual(mockProduct);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_retrieved',
        { vendorId: mockVendorId, productId: mockProductId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProductById(mockVendorId, mockProductId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProductById(mockVendorId, mockProductId)).rejects.toThrow(
        'Product not found',
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_retrieval_failure',
        { vendorId: mockVendorId, productId: mockProductId, reason: 'product_not_found' },
        mockVendorId,
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, name: 'Updated Product Name', price: 55 };
      productModel.findOne.mockResolvedValue(mockProduct);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.updateProduct(mockVendorId, mockProductId, mockUpdateProductDto);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        {
          name: 'Updated Product Name',
          price: 55,
          isActive: true,
          updatedAt: expect.any(Date),
        },
        { new: true },
      );
      expect(result).toEqual(updatedProduct);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_updated',
        { vendorId: mockVendorId, productId: mockProductId, productTitle: 'Updated Product Name' },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProduct(mockVendorId, mockProductId, mockUpdateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProduct(mockVendorId, mockProductId, mockUpdateProductDto)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw ConflictException when name conflicts', async () => {
      // Arrange
      const nameConflict = { ...mockProduct, name: 'Updated Product Name' };
      productModel.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(nameConflict);

      // Act & Assert
      await expect(service.updateProduct(mockVendorId, mockProductId, mockUpdateProductDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateProduct(mockVendorId, mockProductId, mockUpdateProductDto)).rejects.toThrow(
        'Product with this name already exists for this vendor',
      );
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, isActive: false };
      productModel.findOne.mockResolvedValue(mockProduct);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      await service.deleteProduct(mockVendorId, mockProductId);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        { isActive: false },
        { new: true },
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_deleted',
        { vendorId: mockVendorId, productId: mockProductId, productTitle: mockProduct.name },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProduct(mockVendorId, mockProductId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteProduct(mockVendorId, mockProductId)).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('createProductVariant', () => {
    it('should create product variant successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, specifications: { sku: 'VARIANT-SKU-001' }, price: 55 };
      productModel.findOne.mockResolvedValue(mockProduct);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.createProductVariant(mockVendorId, mockProductId, mockCreateVariantDto);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        {
          specifications: {
            sku: 'VARIANT-SKU-001',
            ...mockCreateVariantDto.attributes,
          },
          price: 55,
        },
        { new: true },
      );
      expect(result).toEqual(expect.objectContaining({
        variant_sku: 'VARIANT-SKU-001',
        price_override: 55,
      }));
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_variant_created',
        { vendorId: mockVendorId, productId: mockProductId, variantSku: 'VARIANT-SKU-001' },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createProductVariant(mockVendorId, mockProductId, mockCreateVariantDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createProductVariant(mockVendorId, mockProductId, mockCreateVariantDto)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw ConflictException when variant SKU already exists', async () => {
      // Arrange
      productModel.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProductWithVariant);

      // Act & Assert
      await expect(service.createProductVariant(mockVendorId, mockProductId, mockCreateVariantDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createProductVariant(mockVendorId, mockProductId, mockCreateVariantDto)).rejects.toThrow(
        'Product variant already exists',
      );
    });
  });

  describe('updateProductVariant', () => {
    it('should update product variant successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProductWithVariant, price: 60, specifications: { sku: 'VARIANT-SKU-001', type: 'premium' } };
      productModel.findOne.mockResolvedValue(mockProductWithVariant);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.updateProductVariant(mockVendorId, mockVariantId, mockUpdateVariantDto);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockVariantId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockVariantId,
        {
          price: 60,
          specifications: {
            sku: 'VARIANT-SKU-001',
            type: 'premium',
          },
          isActive: true,
        },
        { new: true },
      );
      expect(result).toEqual(expect.objectContaining({
        variant_sku: 'VARIANT-SKU-001',
        price_override: 60,
        attributes: { sku: 'VARIANT-SKU-001', type: 'premium' },
      }));
    });

    it('should throw NotFoundException when variant not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProductVariant(mockVendorId, mockVariantId, mockUpdateVariantDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProductVariant(mockVendorId, mockVariantId, mockUpdateVariantDto)).rejects.toThrow(
        'Product variant not found',
      );
    });
  });

  describe('deleteProductVariant', () => {
    it('should soft delete product variant successfully', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(mockProductWithVariant);
      productModel.findByIdAndUpdate.mockResolvedValue({ ...mockProductWithVariant, isActive: false });

      // Act
      await service.deleteProductVariant(mockVendorId, mockVariantId);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockVariantId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockVariantId,
        {
          $unset: { 'specifications.sku': 1 },
          price: undefined,
          isActive: false,
        },
        { new: true },
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_variant_deleted',
        { vendorId: mockVendorId, variantId: mockVariantId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProductVariant(mockVendorId, mockVariantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteProductVariant(mockVendorId, mockVariantId)).rejects.toThrow(
        'Product variant not found',
      );
    });
  });

  describe('createProductMapping', () => {
    it('should create product mapping successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, storeMappings: [expect.any(Object)] };
      storeModel.findOne.mockResolvedValue(mockStore);
      productModel.findOne.mockResolvedValue(mockProduct);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.createProductMapping(mockVendorId, mockCreateMappingDto);

      // Assert
      expect(storeModel.findOne).toHaveBeenCalledWith({
        _id: mockStoreId,
        vendorId: mockVendorId,
      });
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        { $push: { storeMappings: expect.any(Object) } },
        { new: true },
      );
      expect(result).toEqual(expect.objectContaining({
        product_id: mockProductId,
        store_id: mockStoreId,
        price: 50,
        stock: 100,
      }));
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_mapping_created',
        { vendorId: mockVendorId, storeId: mockStoreId, productId: mockProductId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        'Store not found',
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(mockStore);
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw ConflictException when mapping already exists', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(mockStore);
      productModel.findOne.mockResolvedValue(mockProductWithMapping);

      // Act & Assert
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createProductMapping(mockVendorId, mockCreateMappingDto)).rejects.toThrow(
        'Product mapping already exists for this store',
      );
    });
  });

  describe('updateProductMapping', () => {
    it('should update product mapping successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProductWithMapping };
      productModel.findOne.mockResolvedValue(mockProductWithMapping);
      productModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Act
      const result = await service.updateProductMapping(mockVendorId, mockProductId, mockUpdateMappingDto);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProductId,
        vendorId: mockVendorId,
      });
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        {
          price: 55,
          stockQuantity: 150,
          areaPincodes: ['110001', '110002', '110003'],
          isAvailable: true,
        },
        { new: true },
      );
      expect(result).toEqual(expect.objectContaining({
        product_id: mockProductId,
        store_id: mockStoreId,
        price: 55,
        stock: 150,
      }));
    });

    it('should throw NotFoundException when mapping not found', async () => {
      // Arrange
      productModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProductMapping(mockVendorId, mockProductId, mockUpdateMappingDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateProductMapping(mockVendorId, mockProductId, mockUpdateMappingDto)).rejects.toThrow(
        'Product mapping not found',
      );
    });
  });

  describe('getProductMappings', () => {
    it('should return product mappings with pagination', async () => {
      // Arrange
      const mockProducts = [mockProductWithMapping];
      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      } as any);

      productModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getProductMappings(mockVendorId, 1, 10);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({ vendorId: mockVendorId });
      expect(productModel.countDocuments).toHaveBeenCalledWith({ vendorId: mockVendorId });
      expect(result).toEqual({
        mappings: expect.arrayContaining([
          expect.objectContaining({
            product_id: mockProductId,
            store_id: mockStoreId,
            price: 50,
            stock: 100,
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_mappings_retrieved',
        { vendorId: mockVendorId, count: 1, page: 1, limit: 10 },
        mockVendorId,
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      productModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.getProductMappings(mockVendorId, 1, 10);

      // Assert
      expect(result).toEqual({
        mappings: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });
  });
});