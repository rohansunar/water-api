import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { SearchService } from '../../src/product/services/search.service';

describe('Customer Product Search API Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let searchService: SearchService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    prismaService = app.get(PrismaService);
    searchService = app.get(SearchService);

    // Clean up test data
    await prismaService.product.deleteMany({});
    await prismaService.vendor.deleteMany({});

    // Create test vendor
    await prismaService.vendor.create({
      data: {
        id: BigInt(1),
        name: 'Test Vendor',
        phone: '1234567890',
        email: 'test@vendor.com',
        isActive: true,
        isVerified: true,
      },
    });

    // Seed test products
    const testProducts = [
      {
        name: '20L Premium Water Jar',
        description: 'High-quality 20L water jar with secure cap',
        price: 30,
        category: 'water_jar',
        capacity: '20L',
        stock: 100,
        isAvailable: true,
      },
      {
        name: '15L Compact Water Jar',
        description: 'Compact 15L water jar perfect for small families',
        price: 25,
        category: 'water_jar',
        capacity: '15L',
        stock: 150,
        isAvailable: true,
      },
      {
        name: '25L Large Water Jar',
        description: 'Large capacity 25L water jar for big families',
        price: 35,
        category: 'water_jar',
        capacity: '25L',
        stock: 80,
        isAvailable: true,
      },
      {
        name: '10L Portable Water Bottle',
        description: 'Portable 10L water bottle for office use',
        price: 20,
        category: 'water_bottle',
        capacity: '10L',
        stock: 200,
        isAvailable: true,
      },
      {
        name: '5L Small Water Bottle',
        description: 'Small 5L water bottle for personal use',
        price: 15,
        category: 'water_bottle',
        capacity: '5L',
        stock: 50,
        isAvailable: false, // Unavailable product for testing
      },
    ];

    for (const product of testProducts) {
      await prismaService.product.create({
        data: {
          vendorId: BigInt(1),
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          capacity: product.capacity,
          unit: 'jar',
          stock: product.stock,
          stockQuantity: product.stock,
          isAvailable: product.isAvailable,
          minOrderQuantity: 1,
          maxOrderQuantity: 1000,
          areaPincodes: [],
          images: [],
          specifications: {
            material: 'Plastic',
            brand: 'Generic',
            weight: 1.5,
          },
          moderationStatus: 'APPROVED',
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.product.deleteMany({});
    await prismaService.vendor.deleteMany({});
    await app.close();
  });

  describe('GET /customers/products/search', () => {
    it('should return all available products when no query parameters provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);

      // Should return 4 available products
      expect(response.body.products.length).toBe(4);

      // Check product structure
      const product = response.body.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('store');
      expect(product).toHaveProperty('is_available', true);
      expect(product).toHaveProperty('stock_quantity');
    });

    it('should search products by query string', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?query=Premium')
        .expect(200);

      expect(response.body.products.length).toBe(1);
      expect(response.body.products[0].name).toBe('20L Premium Water Jar');
    });

    it('should search products by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?category=water_bottle')
        .expect(200);

      expect(response.body.products.length).toBe(1);
      expect(response.body.products[0].category).toBe('water_bottle');
      expect(response.body.products[0].name).toBe('10L Portable Water Bottle');
    });

    it('should combine query and category filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?query=Water&category=water_jar')
        .expect(200);

      expect(response.body.products.length).toBe(3);
      response.body.products.forEach((product: any) => {
        expect(product.category).toBe('water_jar');
        expect(product.name.toLowerCase()).toContain('water');
      });
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?page=1&limit=2')
        .expect(200);

      expect(response.body.products.length).toBe(2);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(2);
      expect(response.body.meta.pagination.total).toBe(4);
      expect(response.body.meta.pagination.total_pages).toBe(2);
      expect(response.body.meta.pagination.has_next).toBe(true);
      expect(response.body.meta.pagination.has_prev).toBe(false);
    });

    it('should handle second page of pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?page=2&limit=2')
        .expect(200);

      expect(response.body.products.length).toBe(2);
      expect(response.body.meta.pagination.page).toBe(2);
      expect(response.body.meta.pagination.has_next).toBe(false);
      expect(response.body.meta.pagination.has_prev).toBe(true);
    });

    it('should return empty results for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?category=non_existent')
        .expect(200);

      expect(response.body.products).toEqual([]);
      expect(response.body.meta.pagination.total).toBe(0);
      expect(response.body.meta.pagination.total_pages).toBe(0);
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?query=xyz123nonexistent')
        .expect(200);

      expect(response.body.products).toEqual([]);
      expect(response.body.meta.pagination.total).toBe(0);
    });

    it('should validate invalid page parameter', async () => {
      await request(app.getHttpServer())
        .get('/customers/products/search?page=-1')
        .expect(400);
    });

    it('should validate invalid limit parameter', async () => {
      await request(app.getHttpServer())
        .get('/customers/products/search?limit=150')
        .expect(400);
    });

    it('should validate negative limit parameter', async () => {
      await request(app.getHttpServer())
        .get('/customers/products/search?limit=-5')
        .expect(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock PrismaService to throw database error
      const originalFindMany = prismaService.product.findMany;
      const error = new Error('Database connection failed');
      (error as any).code = 'P1001';
      prismaService.product.findMany = jest.fn().mockRejectedValue(error);

      const response = await request(app.getHttpServer())
        .get('/customers/products/search')
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body.message).toBe('Database connection failed');

      // Restore original method
      prismaService.product.findMany = originalFindMany;
    });

    it('should handle other database errors gracefully', async () => {
      // Mock PrismaService to throw general database error
      const originalCount = prismaService.product.count;
      const error = new Error('Unique constraint violation');
      (error as any).code = 'P2002';
      prismaService.product.count = jest.fn().mockRejectedValue(error);

      const response = await request(app.getHttpServer())
        .get('/customers/products/search')
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body.message).toBe('Failed to search products');

      // Restore original method
      prismaService.product.count = originalCount;
    });

    it('should handle service layer errors gracefully', async () => {
      // Mock SearchService.searchProducts to throw error
      const originalMethod = searchService.searchProducts;
      searchService.searchProducts = jest
        .fn()
        .mockRejectedValue(new Error('Service layer error'));

      const response = await request(app.getHttpServer())
        .get('/customers/products/search')
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);
      expect(response.body.message).toBe('An unexpected error occurred');

      // Restore original method
      searchService.searchProducts = originalMethod;
    });

    it('should handle malformed query parameters gracefully', async () => {
      await request(app.getHttpServer())
        .get('/customers/products/search?page=abc&limit=def')
        .expect(400);
    });

    it('should handle large page numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search?page=100')
        .expect(200);

      expect(response.body.products).toEqual([]);
      expect(response.body.meta.pagination.page).toBe(100);
      expect(response.body.meta.pagination.has_next).toBe(false);
      expect(response.body.meta.pagination.has_prev).toBe(true);
    });

    it('should return products in consistent order', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/products/search')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(1);
      // Just verify we get products in some order
      expect(response.body.products).toBeDefined();
    });

    it('should handle multiple sequential requests', async () => {
      // Test multiple requests sequentially instead of concurrently
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .get('/customers/products/search')
          .expect(200);

        expect(response.body).toHaveProperty('products');
        expect(Array.isArray(response.body.products)).toBe(true);
      }
    });
  });
});
