import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from '../common/schemas/product.schema';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('ProductService', () => {
  let service: ProductService;
  let productModel: any;
  let logger: any;

  const mockProduct = {
    id: 'product-id',
    vendorId: 'vendor-id',
    name: '20L Water Jar',
    description: 'Premium quality water jar',
    category: 'water_jar',
    capacity: '20L',
    price: 30,
    stock: 100,
    isAvailable: true,
    images: ['/images/jar.jpg'],
    specifications: {
      material: 'Plastic',
      brand: 'Generic',
      weight: 1.5,
      dimensions: { height: 50, length: 30, width: 30 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    productModel = {
      findById: jest.fn(),
      find: jest.fn(),
      findByCategory: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: productModel,
        },
        {
          provide: CustomLoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return product if found', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.findById('product-id');

      expect(result).toEqual(mockProduct);
      expect(productModel.findById).toHaveBeenCalledWith('product-id');
    });

    it('should return null on error', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      const result = await service.findById('product-id');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all available products sorted by creation date', async () => {
      const products = [mockProduct];
      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(productModel.find).toHaveBeenCalledWith({ isAvailable: true });
    });

    it('should throw error on database failure', async () => {
      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await expect(service.findAll()).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('should return products by category sorted by price', async () => {
      const products = [mockProduct];
      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findByCategory('water_jar');

      expect(result).toEqual(products);
      expect(productModel.find).toHaveBeenCalledWith({
        category: 'water_jar',
        isAvailable: true,
      });
    });

    it('should throw error on database failure', async () => {
      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await expect(service.findByCategory('water_jar')).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getProductDetails', () => {
    it('should return product details DTO', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.getProductDetails('product-id');

      expect(result).toHaveProperty('id', 'product-id');
      expect(result).toHaveProperty('name', '20L Water Jar');
      expect(result).toHaveProperty('price', 30);
      expect(result).toHaveProperty('stockQuantity', 100);
      expect(result).toHaveProperty('isActive', true);
      expect(result.specifications.capacity).toBe(20);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getProductDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createProductDto = {
      name: 'New Product',
      description: 'New product description',
      price: 25,
      category: 'water_jar' as any,
      size: '15L' as any,
      depositAmount: 10,
      hasDeposit: true,
      stockQuantity: 50,
      images: ['/images/new.jpg'],
    };

    it('should create product successfully', async () => {
      const createdProduct = { ...mockProduct, ...createProductDto };
      productModel.create.mockResolvedValue(createdProduct);

      const result = await service.create(createProductDto, 'vendor-id');

      expect(result).toEqual(createdProduct);
      expect(productModel.create).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(`Created product: ${createdProduct.id}`);
    });

    it('should create product with default vendor if not provided', async () => {
      const createdProduct = { ...mockProduct, ...createProductDto };
      productModel.create.mockResolvedValue(createdProduct);

      await service.create(createProductDto);

      expect(productModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: 'default-vendor-id' }),
      );
    });

    it('should throw error on creation failure', async () => {
      productModel.create.mockRejectedValue(new Error('Creation failed'));

      await expect(service.create(createProductDto)).rejects.toThrow('Creation failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const updateData = { price: 35 };
      const updatedProduct = { ...mockProduct, ...updateData };
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct),
      });

      const result = await service.update('product-id', updateData);

      expect(result).toEqual(updatedProduct);
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product-id',
        updateData,
        { new: true },
      );
      expect(logger.log).toHaveBeenCalledWith('Updated product: product-id');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('non-existent', { price: 35 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error on update failure', async () => {
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Update failed')),
      });

      await expect(service.update('product-id', { price: 35 })).rejects.toThrow('Update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should update stock successfully with positive change', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 110 }),
      });

      const result = await service.updateStock('product-id', 10);

      expect(result.stock).toBe(110);
      expect(logger.log).toHaveBeenCalledWith('Updated stock for product product-id: 10');
    });

    it('should update stock successfully with negative change', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 90 }),
      });

      const result = await service.updateStock('product-id', -10);

      expect(result.stock).toBe(90);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateStock('non-existent', 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 5 }),
      });

      await expect(service.updateStock('product-id', -10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error on update failure', async () => {
      productModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });
      productModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Update failed')),
      });

      await expect(service.updateStock('product-id', 10)).rejects.toThrow('Update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByLocation', () => {
    it('should return products transformed to DTOs', async () => {
      const products = [mockProduct];
      productModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(products),
        }),
      });

      const result = await service.findByLocation(28.6139, 77.209);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'product-id');
      expect(result[0]).toHaveProperty('name', '20L Water Jar');
      expect(result[0].specifications.capacity).toBe(20);
    });
  });

  describe('searchProducts', () => {
    const searchDto = {
      query: 'water',
      category: 'water_jar',
      pincode: '110001',
      page: 1,
      limit: 20,
    };

    it('should return search results with pagination', async () => {
      const products = [mockProduct];
      productModel.countDocuments.mockResolvedValue(1);
      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(products),
            }),
          }),
        }),
      });

      const result = await service.searchProducts(searchDto);

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('meta');
      expect(result.products).toHaveLength(1);
      expect(result.meta.pagination).toHaveProperty('total', 1);
      expect(result.meta.pagination).toHaveProperty('total_pages', 1);
    });

    it('should search without category filter', async () => {
      const searchDtoNoCategory = { query: 'water', page: 1, limit: 20 };
      productModel.countDocuments.mockResolvedValue(0);
      productModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.searchProducts(searchDtoNoCategory);

      expect(result.products).toHaveLength(0);
      expect(result.meta.pagination.total).toBe(0);
    });

    it('should throw error on search failure', async () => {
      productModel.countDocuments.mockImplementation(() => {
        throw new Error('Search failed');
      });

      await expect(service.searchProducts(searchDto)).rejects.toThrow('Search failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete product successfully', async () => {
      productModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await service.delete('product-id');

      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('product-id');
      expect(logger.log).toHaveBeenCalledWith('Deleted product: product-id');
    });

    it('should throw error on deletion failure', async () => {
      productModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Deletion failed')),
      });

      await expect(service.delete('product-id')).rejects.toThrow('Deletion failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('seedTestData', () => {
    it('should seed test data successfully', async () => {
      productModel.findOne.mockResolvedValue(null);
      productModel.create.mockResolvedValue(mockProduct);

      await service.seedTestData();

      expect(productModel.create).toHaveBeenCalledTimes(4); // 4 test products
      expect(logger.log).toHaveBeenCalledWith('Product test data seeded successfully');
    });

    it('should skip existing products', async () => {
      productModel.findOne.mockResolvedValue(mockProduct);

      await service.seedTestData();

      expect(productModel.create).not.toHaveBeenCalled();
    });

    it('should throw error on seeding failure', async () => {
      productModel.findOne.mockImplementation(() => {
        throw new Error('Seeding failed');
      });

      await expect(service.seedTestData()).rejects.toThrow('Seeding failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
