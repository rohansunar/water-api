import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { VendorProductController } from './vendor-product.controller';
import { VendorProductService } from './vendor-product.service';
import { VendorJwtAuthGuard } from './guards/vendor-jwt-auth.guard';
import { CustomLoggerService } from '../common/logger/logger.service';
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

describe('VendorProductController', () => {
  let controller: VendorProductController;
  let service: jest.Mocked<VendorProductService>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  const mockVendorId = 'vendor-123';
  const mockProductId = 'product-456';
  const mockVariantId = 'variant-789';
  const mockMappingId = 'mapping-101';

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
    store_id: 'store-123',
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

  const mockProduct: VendorProductResponseDto = {
    id: mockProductId,
    vendor_id: mockVendorId,
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
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockVariant: VendorProductVariantResponseDto = {
    id: mockVariantId,
    product_id: mockProductId,
    variant_sku: 'PW-20L-MINERAL-001',
    attributes: { type: 'mineral', brand: 'AquaPure' },
    price_override: 55,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMapping: VendorProductMappingResponseDto = {
    id: `${mockProductId}-store-123`,
    product_id: mockProductId,
    store_id: 'store-123',
    product_variant_id: mockProductId,
    price: 50,
    stock: 100,
    reserved_stock: 0,
    area_pincodes: ['110001', '110002'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMappingsResponse = {
    mappings: [mockMapping],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    const mockService = {
      createProduct: jest.fn(),
      getProducts: jest.fn(),
      getProductById: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      createProductVariant: jest.fn(),
      updateProductVariant: jest.fn(),
      deleteProductVariant: jest.fn(),
      createProductMapping: jest.fn(),
      updateProductMapping: jest.fn(),
      getProductMappings: jest.fn(),
    };

    const mockCustomLoggerService = {
      logBusinessEvent: jest.fn(),
      logDatabaseOperation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorProductController],
      providers: [
        {
          provide: VendorProductService,
          useValue: mockService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    })
      .overrideGuard(VendorJwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<VendorProductController>(VendorProductController);
    service = module.get(VendorProductService);
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      // Arrange
      service.createProduct.mockResolvedValue(mockProduct);

      // Act
      const result = await controller.createProduct(mockCreateProductDto, mockVendorId);

      // Assert
      expect(service.createProduct).toHaveBeenCalledWith(mockVendorId, mockCreateProductDto);
      expect(result).toEqual(mockProduct);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_attempt',
        { vendorId: mockVendorId, productTitle: mockCreateProductDto.title, sku: mockCreateProductDto.sku },
        mockVendorId,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new BadRequestException('Product creation failed');
      service.createProduct.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createProduct(mockCreateProductDto, mockVendorId)).rejects.toThrow(
        BadRequestException,
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_creation_attempt',
        { vendorId: mockVendorId, productTitle: mockCreateProductDto.title, sku: mockCreateProductDto.sku },
        mockVendorId,
      );
    });
  });

  describe('getProducts', () => {
    it('should return products with default pagination', async () => {
      // Arrange
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
      };
      service.getProducts.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getProducts(mockVendorId);

      // Assert
      expect(service.getProducts).toHaveBeenCalledWith(mockVendorId, 1, 10, undefined, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should return products with custom pagination and filters', async () => {
      // Arrange
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 2,
        limit: 5,
      };
      service.getProducts.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getProducts(mockVendorId, '2', '5', 'true', 'water_jar');

      // Assert
      expect(service.getProducts).toHaveBeenCalledWith(mockVendorId, 2, 5, true, 'water_jar');
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.getProducts.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProducts(mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('getProductById', () => {
    it('should return product successfully', async () => {
      // Arrange
      service.getProductById.mockResolvedValue(mockProduct);

      // Act
      const result = await controller.getProductById(mockProductId, mockVendorId);

      // Assert
      expect(service.getProductById).toHaveBeenCalledWith(mockVendorId, mockProductId);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      service.getProductById.mockRejectedValue(new NotFoundException('Product not found'));

      // Act & Assert
      await expect(controller.getProductById(mockProductId, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.getProductById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProductById(mockProductId, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, title: 'Updated Product Name', base_price: 55 };
      service.updateProduct.mockResolvedValue(updatedProduct);

      // Act
      const result = await controller.updateProduct(mockProductId, mockUpdateProductDto, mockVendorId);

      // Assert
      expect(service.updateProduct).toHaveBeenCalledWith(mockVendorId, mockProductId, mockUpdateProductDto);
      expect(result).toEqual(updatedProduct);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_update_attempt',
        { productId: mockProductId, vendorId: mockVendorId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      service.updateProduct.mockRejectedValue(new NotFoundException('Product not found'));

      // Act & Assert
      await expect(controller.updateProduct(mockProductId, mockUpdateProductDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when name conflicts', async () => {
      // Arrange
      service.updateProduct.mockRejectedValue(new ConflictException('Product with this name already exists'));

      // Act & Assert
      await expect(controller.updateProduct(mockProductId, mockUpdateProductDto, mockVendorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.updateProduct.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateProduct(mockProductId, mockUpdateProductDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      // Arrange
      service.deleteProduct.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteProduct(mockProductId, mockVendorId);

      // Assert
      expect(service.deleteProduct).toHaveBeenCalledWith(mockVendorId, mockProductId);
      expect(result).toBeUndefined();
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_deletion_attempt',
        { productId: mockProductId, vendorId: mockVendorId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      service.deleteProduct.mockRejectedValue(new NotFoundException('Product not found'));

      // Act & Assert
      await expect(controller.deleteProduct(mockProductId, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.deleteProduct.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProduct(mockProductId, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('createProductVariant', () => {
    it('should create product variant successfully', async () => {
      // Arrange
      service.createProductVariant.mockResolvedValue(mockVariant);

      // Act
      const result = await controller.createProductVariant(mockProductId, mockCreateVariantDto, mockVendorId);

      // Assert
      expect(service.createProductVariant).toHaveBeenCalledWith(mockVendorId, mockProductId, mockCreateVariantDto);
      expect(result).toEqual(mockVariant);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_variant_creation_attempt',
        { productId: mockProductId, vendorId: mockVendorId, variantSku: mockCreateVariantDto.variant_sku },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      service.createProductVariant.mockRejectedValue(new NotFoundException('Product not found'));

      // Act & Assert
      await expect(controller.createProductVariant(mockProductId, mockCreateVariantDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when variant SKU already exists', async () => {
      // Arrange
      service.createProductVariant.mockRejectedValue(new ConflictException('Product variant already exists'));

      // Act & Assert
      await expect(controller.createProductVariant(mockProductId, mockCreateVariantDto, mockVendorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.createProductVariant.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createProductVariant(mockProductId, mockCreateVariantDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('updateProductVariant', () => {
    it('should update product variant successfully', async () => {
      // Arrange
      const updatedVariant = { ...mockVariant, price_override: 60, attributes: { type: 'premium' } };
      service.updateProductVariant.mockResolvedValue(updatedVariant);

      // Act
      const result = await controller.updateProductVariant(mockVariantId, mockUpdateVariantDto, mockVendorId);

      // Assert
      expect(service.updateProductVariant).toHaveBeenCalledWith(mockVendorId, mockVariantId, mockUpdateVariantDto);
      expect(result).toEqual(updatedVariant);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_variant_update_attempt',
        { variantId: mockVariantId, vendorId: mockVendorId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      // Arrange
      service.updateProductVariant.mockRejectedValue(new NotFoundException('Product variant not found'));

      // Act & Assert
      await expect(controller.updateProductVariant(mockVariantId, mockUpdateVariantDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.updateProductVariant.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateProductVariant(mockVariantId, mockUpdateVariantDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('deleteProductVariant', () => {
    it('should delete product variant successfully', async () => {
      // Arrange
      service.deleteProductVariant.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteProductVariant(mockVariantId, mockVendorId);

      // Assert
      expect(service.deleteProductVariant).toHaveBeenCalledWith(mockVendorId, mockVariantId);
      expect(result).toBeUndefined();
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_variant_deletion_attempt',
        { variantId: mockVariantId, vendorId: mockVendorId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      // Arrange
      service.deleteProductVariant.mockRejectedValue(new NotFoundException('Product variant not found'));

      // Act & Assert
      await expect(controller.deleteProductVariant(mockVariantId, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.deleteProductVariant.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductVariant(mockVariantId, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('createProductMapping', () => {
    it('should create product mapping successfully', async () => {
      // Arrange
      service.createProductMapping.mockResolvedValue(mockMapping);

      // Act
      const result = await controller.createProductMapping(mockCreateMappingDto, mockVendorId);

      // Assert
      expect(service.createProductMapping).toHaveBeenCalledWith(mockVendorId, mockCreateMappingDto);
      expect(result).toEqual(mockMapping);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_mapping_creation_attempt',
        { vendorId: mockVendorId, storeId: mockCreateMappingDto.store_id, productId: mockCreateMappingDto.product_variant_id },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      service.createProductMapping.mockRejectedValue(new NotFoundException('Store not found'));

      // Act & Assert
      await expect(controller.createProductMapping(mockCreateMappingDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      service.createProductMapping.mockRejectedValue(new NotFoundException('Product not found'));

      // Act & Assert
      await expect(controller.createProductMapping(mockCreateMappingDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when mapping already exists', async () => {
      // Arrange
      service.createProductMapping.mockRejectedValue(new ConflictException('Product mapping already exists for this store'));

      // Act & Assert
      await expect(controller.createProductMapping(mockCreateMappingDto, mockVendorId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.createProductMapping.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createProductMapping(mockCreateMappingDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('updateProductMapping', () => {
    it('should update product mapping successfully', async () => {
      // Arrange
      const updatedMapping = { ...mockMapping, price: 55, stock: 150 };
      service.updateProductMapping.mockResolvedValue(updatedMapping);

      // Act
      const result = await controller.updateProductMapping(mockMappingId, mockUpdateMappingDto, mockVendorId);

      // Assert
      expect(service.updateProductMapping).toHaveBeenCalledWith(mockVendorId, mockMappingId, mockUpdateMappingDto);
      expect(result).toEqual(updatedMapping);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'product_mapping_update_attempt',
        { mappingId: mockMappingId, vendorId: mockVendorId },
        mockVendorId,
      );
    });

    it('should throw NotFoundException when mapping not found', async () => {
      // Arrange
      service.updateProductMapping.mockRejectedValue(new NotFoundException('Product mapping not found'));

      // Act & Assert
      await expect(controller.updateProductMapping(mockMappingId, mockUpdateMappingDto, mockVendorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.updateProductMapping.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateProductMapping(mockMappingId, mockUpdateMappingDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('getProductMappings', () => {
    it('should return product mappings with default pagination', async () => {
      // Arrange
      service.getProductMappings.mockResolvedValue(mockMappingsResponse);

      // Act
      const result = await controller.getProductMappings(mockVendorId);

      // Assert
      expect(service.getProductMappings).toHaveBeenCalledWith(mockVendorId, 1, 10);
      expect(result).toEqual(mockMappingsResponse);
    });

    it('should return product mappings with custom pagination', async () => {
      // Arrange
      service.getProductMappings.mockResolvedValue(mockMappingsResponse);

      // Act
      const result = await controller.getProductMappings(mockVendorId, '2', '5');

      // Assert
      expect(service.getProductMappings).toHaveBeenCalledWith(mockVendorId, 2, 5);
      expect(result).toEqual(mockMappingsResponse);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.getProductMappings.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProductMappings(mockVendorId)).rejects.toThrow(error);
    });
  });
});