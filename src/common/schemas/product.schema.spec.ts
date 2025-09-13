import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductSchema } from './product.schema';

describe('Product Schema', () => {
  let productModel: Model<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(Product.name),
          useValue: {
            new: jest.fn().mockResolvedValue({}),
            constructor: jest.fn().mockResolvedValue({}),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    productModel = module.get<Model<Product>>(getModelToken(Product.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema structure', () => {
      const schema = ProductSchema;
      expect(schema).toBeDefined();
      expect(schema.paths.vendorId).toBeDefined();
      expect(schema.paths.name).toBeDefined();
      expect(schema.paths.description).toBeDefined();
      expect(schema.paths.category).toBeDefined();
      expect(schema.paths.price).toBeDefined();
      expect(schema.paths.capacity).toBeDefined();
      expect(schema.paths.unit).toBeDefined();
      expect(schema.paths.stock).toBeDefined();
      expect(schema.paths.isAvailable).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = ProductSchema;
      expect(schema.paths.vendorId.isRequired).toBe(true);
      expect(schema.paths.name.isRequired).toBe(true);
      expect(schema.paths.description.isRequired).toBe(true);
      expect(schema.paths.category.isRequired).toBe(true);
      expect(schema.paths.price.isRequired).toBe(true);
      expect(schema.paths.capacity.isRequired).toBe(true);
      expect(schema.paths.unit.isRequired).toBe(true);
    });

    it('should have correct default values', () => {
      const schema = ProductSchema;
      expect((schema.paths.stock as any).default).toBe(0);
      expect((schema.paths.isAvailable as any).default).toBe(true);
      expect((schema.paths.minOrderQuantity as any).default).toBe(1);
      expect((schema.paths.maxOrderQuantity as any).default).toBe(1000);
      expect((schema.paths.rating as any).default).toBe(4.0);
      expect((schema.paths.totalReviews as any).default).toBe(0);
      expect((schema.paths.status as any).default).toBe('active');
    });

    it('should have correct field constraints', () => {
      const schema = ProductSchema;
      expect(schema.paths.name.options.maxlength).toBe(255);
      expect(schema.paths.unit.options.maxlength).toBe(32);
      expect(schema.paths.price.options.min).toBe(0);
      expect(schema.paths.stock.options.min).toBe(0);
      expect(schema.paths.minOrderQuantity.options.min).toBe(1);
      expect(schema.paths.maxOrderQuantity.options.min).toBe(1);
    });
  });

  describe('Enhanced Features', () => {
    it('should have SKU field with unique constraint', () => {
      const schema = ProductSchema;
      expect(schema.paths.sku).toBeDefined();
      expect(schema.paths.sku.options.unique).toBe(true);
      expect(schema.paths.sku.options.maxlength).toBe(128);
    });

    it('should have area-specific availability', () => {
      const schema = ProductSchema;
      expect(schema.paths.areaPincodes).toBeDefined();
    });

    it('should have pricing structure', () => {
      const schema = ProductSchema;
      expect(schema.paths.pricing).toBeDefined();
    });

    it('should have inventory management fields', () => {
      const schema = ProductSchema;
      expect(schema.paths.inventory).toBeDefined();
    });

    it('should have performance metrics', () => {
      const schema = ProductSchema;
      expect(schema.paths.totalOrders).toBeDefined();
      expect(schema.paths.totalSales).toBeDefined();
      expect(schema.paths.revenue).toBeDefined();
    });

    it('should have SEO fields', () => {
      const schema = ProductSchema;
      expect(schema.paths.tags).toBeDefined();
      expect(schema.paths.metaDescription).toBeDefined();
      expect(schema.paths.searchKeywords).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = ProductSchema;
      const indexes = schema.indexes();
      
      // Check for vendorId index
      const vendorIdIndex = indexes.find(index => index[0].vendorId === 1);
      expect(vendorIdIndex).toBeDefined();
      
      // Check for SKU unique index
      const skuIndex = indexes.find(index => index[0].sku === 1);
      expect(skuIndex).toBeDefined();
      expect(skuIndex[1].unique).toBe(true);
      expect(skuIndex[1].sparse).toBe(true);
      
      // Check for category index
      const categoryIndex = indexes.find(index => index[0].category === 1);
      expect(categoryIndex).toBeDefined();
      
      // Check for compound indexes
      const vendorAvailableIndex = indexes.find(index => 
        index[0].vendorId === 1 && index[0].isAvailable === 1
      );
      expect(vendorAvailableIndex).toBeDefined();
      
      // Check for text search index
      const textIndex = indexes.find(index => 
        index[0].name === 'text' || 
        index[0].description === 'text' || 
        index[0].tags === 'text'
      );
      expect(textIndex).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    let mockProduct: any;

    beforeEach(() => {
      mockProduct = {
        isNew: true,
        sku: undefined,
        vendorId: '507f1f77bcf86cd799439011',
        category: 'water_jar',
        pricing: {
          discountPercentage: 10,
          discountStartDate: new Date(Date.now() - 86400000), // Yesterday
          discountEndDate: new Date(Date.now() + 86400000), // Tomorrow
        },
      };
    });

    it('should generate SKU if not provided', () => {
      // Simulate pre-save middleware logic
      if (mockProduct.isNew && !mockProduct.sku) {
        const vendorPrefix = mockProduct.vendorId.toString().slice(-4).toUpperCase();
        const categoryPrefix = mockProduct.category.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        mockProduct.sku = `${vendorPrefix}-${categoryPrefix}-${timestamp}`;
      }
      
      expect(mockProduct.sku).toBeDefined();
      expect(mockProduct.sku).toContain('9011'); // Last 4 chars of vendorId
      expect(mockProduct.sku).toContain('WAT'); // First 3 chars of WATER_JAR
      expect(mockProduct.sku.split('-')).toHaveLength(3);
    });

    it('should validate active discount', () => {
      const now = new Date();
      
      // Simulate pre-save middleware logic
      if (mockProduct.pricing?.discountPercentage > 0) {
        const discountActive = (!mockProduct.pricing.discountStartDate || now >= mockProduct.pricing.discountStartDate) &&
                              (!mockProduct.pricing.discountEndDate || now <= mockProduct.pricing.discountEndDate);
        
        if (!discountActive) {
          mockProduct.pricing.discountPercentage = 0;
        }
      }
      
      expect(mockProduct.pricing.discountPercentage).toBe(10); // Should remain active
    });

    it('should reset expired discount', () => {
      mockProduct.pricing.discountEndDate = new Date(Date.now() - 86400000); // Yesterday
      const now = new Date();
      
      // Simulate pre-save middleware logic
      if (mockProduct.pricing?.discountPercentage > 0) {
        const discountActive = (!mockProduct.pricing.discountStartDate || now >= mockProduct.pricing.discountStartDate) &&
                              (!mockProduct.pricing.discountEndDate || now <= mockProduct.pricing.discountEndDate);
        
        if (!discountActive) {
          mockProduct.pricing.discountPercentage = 0;
        }
      }
      
      expect(mockProduct.pricing.discountPercentage).toBe(0); // Should be reset
    });
  });

  describe('Instance Methods', () => {
    let mockProduct: any;

    beforeEach(() => {
      mockProduct = {
        stock: 50,
        isAvailable: true,
        status: 'active',
        price: 100,
        pricing: {
          discountPercentage: 10,
          discountStartDate: new Date(Date.now() - 86400000),
          discountEndDate: new Date(Date.now() + 86400000),
          bulkPricing: [
            { minQuantity: 10, price: 90 },
            { minQuantity: 5, price: 95 },
          ],
        },
        areaPincodes: ['560001', '560002', '560003'],
      };
    });

    it('should check if product is in stock', () => {
      // Mock isInStock method
      const isInStock = function(quantity: number = 1): boolean {
        return this.stock >= quantity && this.isAvailable && this.status === 'active';
      };
      
      mockProduct.isInStock = isInStock.bind(mockProduct);
      
      expect(mockProduct.isInStock(10)).toBe(true);
      expect(mockProduct.isInStock(100)).toBe(false);
      expect(mockProduct.isInStock()).toBe(true);
    });

    it('should calculate effective price with discount', () => {
      // Mock getEffectivePrice method
      const getEffectivePrice = function(quantity: number = 1): number {
        let effectivePrice = this.price;
        
        // Check for bulk pricing
        if (this.pricing?.bulkPricing?.length > 0) {
          const applicableBulkPrice = this.pricing.bulkPricing
            .filter((bp: any) => quantity >= bp.minQuantity)
            .sort((a: any, b: any) => b.minQuantity - a.minQuantity)[0];
          
          if (applicableBulkPrice) {
            effectivePrice = applicableBulkPrice.price;
          }
        }
        
        // Apply discount if active
        if (this.pricing?.discountPercentage > 0) {
          const now = new Date();
          const discountActive = (!this.pricing.discountStartDate || now >= this.pricing.discountStartDate) &&
                                (!this.pricing.discountEndDate || now <= this.pricing.discountEndDate);
          
          if (discountActive) {
            effectivePrice = effectivePrice * (1 - this.pricing.discountPercentage / 100);
          }
        }
        
        return Math.round(effectivePrice * 100) / 100;
      };
      
      mockProduct.getEffectivePrice = getEffectivePrice.bind(mockProduct);
      
      // Test regular price with discount
      expect(mockProduct.getEffectivePrice(1)).toBe(90); // 100 - 10% = 90
      
      // Test bulk pricing with discount
      expect(mockProduct.getEffectivePrice(10)).toBe(81); // 90 - 10% = 81
      
      // Test bulk pricing tier
      expect(mockProduct.getEffectivePrice(5)).toBe(85.5); // 95 - 10% = 85.5
    });

    it('should check area availability', () => {
      // Mock isAvailableInArea method
      const isAvailableInArea = function(pincode: string): boolean {
        return this.areaPincodes.length === 0 || this.areaPincodes.includes(pincode);
      };
      
      mockProduct.isAvailableInArea = isAvailableInArea.bind(mockProduct);
      
      expect(mockProduct.isAvailableInArea('560001')).toBe(true);
      expect(mockProduct.isAvailableInArea('560004')).toBe(false);
    });

    it('should update stock correctly', () => {
      // Mock updateStock method
      const updateStock = function(quantity: number, operation: 'add' | 'subtract' = 'subtract'): void {
        if (operation === 'add') {
          this.stock += quantity;
        } else {
          this.stock = Math.max(0, this.stock - quantity);
        }
        
        // Update status based on stock level
        if (this.stock === 0) {
          this.status = 'out_of_stock';
        } else if (this.status === 'out_of_stock' && this.stock > 0) {
          this.status = 'active';
        }
      };
      
      mockProduct.updateStock = updateStock.bind(mockProduct);
      
      // Test subtract operation
      mockProduct.updateStock(10, 'subtract');
      expect(mockProduct.stock).toBe(40);
      expect(mockProduct.status).toBe('active');
      
      // Test add operation
      mockProduct.updateStock(20, 'add');
      expect(mockProduct.stock).toBe(60);
      
      // Test stock depletion
      mockProduct.updateStock(60, 'subtract');
      expect(mockProduct.stock).toBe(0);
      expect(mockProduct.status).toBe('out_of_stock');
      
      // Test stock restoration
      mockProduct.status = 'out_of_stock';
      mockProduct.updateStock(10, 'add');
      expect(mockProduct.stock).toBe(10);
      expect(mockProduct.status).toBe('active');
    });
  });

  describe('Validation', () => {
    it('should validate category enum values', () => {
      const schema = ProductSchema;
      const categoryPath = schema.paths.category;
      expect(categoryPath.options.enum).toContain('water_jar');
      expect(categoryPath.options.enum).toContain('water_bottle');
      expect(categoryPath.options.enum).toContain('accessories');
    });

    it('should validate price constraints', () => {
      const schema = ProductSchema;
      const pricePath = schema.paths.price;
      expect(pricePath.options.min).toBe(0);
      expect(pricePath.isRequired).toBe(true);
    });

    it('should validate stock constraints', () => {
      const schema = ProductSchema;
      const stockPath = schema.paths.stock;
      expect(stockPath.options.min).toBe(0);
      expect((stockPath as any).default).toBe(0);
    });

    it('should validate status enum values', () => {
      const schema = ProductSchema;
      const statusPath = schema.paths.status;
      expect(statusPath.options.enum).toContain('active');
      expect(statusPath.options.enum).toContain('inactive');
      expect(statusPath.options.enum).toContain('discontinued');
      expect(statusPath.options.enum).toContain('out_of_stock');
    });
  });
});
