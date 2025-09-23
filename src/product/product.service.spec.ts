import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product, ProductDocument } from '../common/schemas/product.schema';
import { CustomLoggerService } from '../common/logger/logger.service';
import { ProductResponseDto, CreateProductDto } from '../common/dto/product.dto';

describe('ProductService', () => {
  let service: ProductService;
  let productModel: Model<ProductDocument>;
  let logger: CustomLoggerService;

  const mockProduct = {
    _id: 'product123',
    id: 'product123',
    vendorId: 'vendor123',
    name: '20L Water Jar',
    description: 'Premium quality 20L water jar',
    category: 'water_jar' as any,
    capacity: '20L',
    unit: 'jar',
    price: 30,
    stock: 100,
    isAvailable: true,
    minOrderQuantity: 1,
    maxOrderQuantity: 1000,
    areaPincodes: [],
    images: ['/images/jar-20l.jpg'],
    specifications: {
      material: 'Plastic',
      brand: 'Generic',
      weight: 1.5,
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn(() => ({
      _id: 'product123',
      id: 'product123',
      vendorId: 'vendor123',
      name: '20L Water Jar',
      description: 'Premium quality 20L water jar',
      category: 'water_jar',
      capacity: '20L',
      unit: 'jar',
      price: 30,
      stock: 100,
      isAvailable: true,
      minOrderQuantity: 1,
      maxOrderQuantity: 1000,
      areaPincodes: [],
      images: ['/images/jar-20l.jpg'],
      specifications: {
        material: 'Plastic',
        brand: 'Generic',
        weight: 1.5,
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  const mockProductModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    exec: jest.fn(),
  };

  const mockLogger = {
    logModuleAction: jest.fn(),
    logPerformance: jest.fn(),
    logEvent: jest.fn(),
    logApiError: jest.fn(),
    logMemoryUsage: jest.fn(),
    logDatabaseOperation: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productModel = module.get<Model<ProductDocument>>(getModelToken(Product.name));
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return product when it exists', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.findById('product123');

      expect(result).toEqual(mockProduct);
      expect(mockProductModel.findById).toHaveBeenCalledWith('product123');
    });

    it('should return null when product does not exist', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      const result = await service.findById('product123');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding product by ID product123:',
        error
      );
    });
  });

  describe('findAll', () => {
    it('should return all available products', async () => {
      const products = [mockProduct];
      mockProductModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(mockProductModel.find).toHaveBeenCalledWith({ isAvailable: true });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(error),
        }),
      });

      await expect(service.findAll()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Error finding all products:', error);
    });
  });

  describe('findByCategory', () => {
    it('should return products by category', async () => {
      const products = [mockProduct];
      mockProductModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findByCategory('water_jar');

      expect(result).toEqual(products);
      expect(mockProductModel.find).toHaveBeenCalledWith({
        category: 'water_jar',
        isAvailable: true,
      });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(error),
        }),
      });

      await expect(service.findByCategory('water_jar')).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding products by category water_jar:',
        error
      );
    });
  });

  describe('getProductDetails', () => {
    it('should return product details when product exists', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.getProductDetails('product123');

      expect(result).toEqual({
        id: 'product123',
        vendorId: 'vendor123',
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar',
        category: 'water_jar',
        size: '20L',
        price: 30,
        depositAmount: 0,
        hasDeposit: false,
        stockQuantity: 100,
        isActive: true,
        images: ['/images/jar-20l.jpg'],
        specifications: {
          capacity: 20,
          material: 'Plastic',
          brand: 'Generic',
          weight: 1.5,
          dimensions: {
            height: 50,
            diameter: 30,
          },
        },
        vendor: {
          id: 'vendor123',
          businessName: 'Default Vendor',
          rating: 4.5,
          totalOrders: 100,
          deliveryZones: [],
        },
        createdAt: mockProduct.createdAt,
        updatedAt: mockProduct.updatedAt,
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getProductDetails('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: '20L Water Jar',
      description: 'Premium quality 20L water jar',
      price: 30,
      category: 'water_jar' as any,
      size: '20L' as any,
      depositAmount: 50,
      hasDeposit: true,
      stockQuantity: 100,
      images: ['/images/jar-20l.jpg'],
    };

    it('should create a new product successfully', async () => {
      const createdProduct = { ...mockProduct, _id: 'newProduct123', id: 'newProduct123' };
      mockProductModel.create.mockResolvedValue(createdProduct);

      const result = await service.create(createProductDto, 'vendor123');

      expect(result).toEqual(createdProduct);
      expect(mockProductModel.create).toHaveBeenCalledWith({
        vendorId: 'vendor123',
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar',
        price: 30,
        category: 'water_jar',
        capacity: '20L',
        unit: 'jar',
        stock: 100,
        isAvailable: true,
        minOrderQuantity: 1,
        maxOrderQuantity: 1000,
        areaPincodes: [],
        images: ['/images/jar-20l.jpg'],
        specifications: {
          material: 'Plastic',
          brand: 'Generic',
          weight: 1.5,
        },
        status: 'active',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('Created product: newProduct123');
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.create.mockRejectedValue(error);

      await expect(service.create(createProductDto)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating product:', error);
    });
  });

  describe('update', () => {
    const updateData = { price: 35 };

    it('should update product successfully', async () => {
      const updatedProduct = { ...mockProduct, price: 35 };
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct),
      });

      const result = await service.update('product123', updateData);

      expect(result).toEqual(updatedProduct);
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        updateData,
        { new: true }
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Updated product: product123');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistent', updateData)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.update('product123', updateData)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating product product123:',
        error
      );
    });
  });

  describe('updateStock', () => {
    it('should update stock successfully', async () => {
      const updatedProduct = { ...mockProduct, stock: 150, id: 'product123' };
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });
      mockProductModel.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      const result = await service.updateStock('product123', 50);

      expect(result).toEqual(updatedProduct);
      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        { stock: 150 },
        { new: true }
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Updated stock for product product123: 50');
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(service.updateStock('product123', -150)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateStock('nonexistent', 10)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByLocation', () => {
    it('should return products for location', async () => {
      const products = [mockProduct];
      mockProductModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findByLocation(28.6139, 77.2090);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'product123',
        vendorId: 'vendor123',
        name: '20L Water Jar',
        description: 'Premium quality 20L water jar',
        category: 'water_jar',
        size: '20L',
        price: 30,
        depositAmount: 0,
        hasDeposit: false,
        stockQuantity: 100,
        isActive: true,
        images: ['/images/jar-20l.jpg'],
        specifications: {
          capacity: 20,
          material: 'Plastic',
          brand: 'Generic',
          weight: 1.5,
          dimensions: {
            height: 50,
            diameter: 30,
          },
        },
        vendor: {
          id: 'vendor123',
          businessName: 'Default Vendor',
          rating: 4.5,
          totalOrders: 100,
          deliveryZones: [],
        },
        createdAt: mockProduct.createdAt,
        updatedAt: mockProduct.updatedAt,
      });
    });
  });

  describe('delete', () => {
    it('should delete product successfully', async () => {
      mockProductModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await service.delete('product123');

      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith('product123');
      expect(mockLogger.log).toHaveBeenCalledWith('Deleted product: product123');
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.delete('product123')).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting product product123:',
        error
      );
    });
  });

  describe('seedTestData', () => {
    it('should seed test data successfully', async () => {
      const existingProduct = { ...mockProduct, name: '20L Water Jar' };
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existing product
      });
      mockProductModel.create.mockResolvedValue(mockProduct);

      await service.seedTestData();

      expect(mockProductModel.create).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('Product test data seeded successfully');
    });

    it('should skip existing products', async () => {
      const existingProduct = { ...mockProduct, name: '20L Water Jar' };
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingProduct),
      });

      await service.seedTestData();

      expect(mockProductModel.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.seedTestData()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error seeding product test data:',
        error
      );
    });
  });
});