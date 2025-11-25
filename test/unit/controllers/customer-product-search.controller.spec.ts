import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { CustomerSearchController } from '../../../src/customer/controllers/customer-search.controller';
import { SearchService } from '../../../src/product/services/search.service';
import { CustomLoggerService } from '../../../src/common/logger/logger.service';
import {
  SearchProductsQueryDto,
  SearchProductsResponseDto,
} from '../../../src/customer/dto/customer-product-search.dto';

// Mock services
jest.mock('../../../src/product/services/search.service');
jest.mock('../../../src/common/logger/logger.service', () => ({
  CustomLoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    logApiRequest: jest.fn(),
    logApiError: jest.fn(),
  })),
}));

describe('CustomerSearchController', () => {
  let controller: CustomerSearchController;
  let searchService: jest.Mocked<SearchService>;
  let logger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerSearchController],
      providers: [SearchService, CustomLoggerService],
    }).compile();

    controller = module.get<CustomerSearchController>(CustomerSearchController);
    searchService = module.get(SearchService);
    logger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    const mockResponse: SearchProductsResponseDto = {
      products: [
        {
          id: '1',
          name: 'Test Product',
          category: 'beverages',
          subcategory: '1L',
          price: 25.99,
          store: {
            id: 'store-1',
            name: 'Test Store',
            rating: 4.5,
            distance_km: 2.3,
          },
          is_available: true,
          stock_quantity: 100,
        },
      ],
      meta: {
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      },
    };

    it('should return products successfully with basic search', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'water' };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
      expect(logger.logApiRequest).toHaveBeenCalledWith(
        'GET',
        '/customers/products/search',
        HttpStatus.OK,
        expect.any(Number),
      );
    });

    it('should return products successfully with category filter', async () => {
      const queryDto: SearchProductsQueryDto = { category: 'beverages' };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should return products successfully with pincode filter', async () => {
      const queryDto: SearchProductsQueryDto = { pincode: '110001' };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should return products successfully with all filters', async () => {
      const queryDto: SearchProductsQueryDto = {
        query: 'premium water',
        category: 'beverages',
        pincode: '110001',
        page: 1,
        limit: 10,
      };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should handle pagination correctly', async () => {
      const queryDto: SearchProductsQueryDto = { page: 2, limit: 5 };
      const paginatedResponse: SearchProductsResponseDto = {
        ...mockResponse,
        meta: {
          pagination: {
            page: 2,
            limit: 5,
            total: 15,
            total_pages: 3,
            has_next: true,
            has_prev: true,
          },
        },
      };

      searchService.searchProducts.mockResolvedValue(paginatedResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(paginatedResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should handle empty results', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'nonexistent' };
      const emptyResponse: SearchProductsResponseDto = {
        products: [],
        meta: {
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
      };

      searchService.searchProducts.mockResolvedValue(emptyResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(emptyResponse);
      expect(result.products).toHaveLength(0);
      expect(result.meta.pagination.total).toBe(0);
    });

    it('should handle default pagination values', async () => {
      const queryDto = {}; // No pagination specified

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(
        queryDto as SearchProductsQueryDto,
      );

      expect(result).toEqual(mockResponse);
      // The service receives the queryDto as passed, defaults are handled by DTO validation pipes in real usage
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should handle database connection error (P1001)', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'test' };
      const error = new Error('Database connection failed');
      (error as any).code = 'P1001';

      searchService.searchProducts.mockRejectedValue(error);

      await expect(controller.searchProducts(queryDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(logger.logApiError).toHaveBeenCalledWith(
        '/customers/products/search',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });

    it('should handle database connection error (P2028)', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'test' };
      const error = new Error('Transaction timeout');
      (error as any).code = 'P2028';

      searchService.searchProducts.mockRejectedValue(error);

      await expect(controller.searchProducts(queryDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle other database errors', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'test' };
      const error = new Error('Unique constraint violation');
      (error as any).code = 'P2002';

      searchService.searchProducts.mockRejectedValue(error);

      await expect(controller.searchProducts(queryDto)).rejects.toThrow(
        'Failed to search products',
      );
    });

    it('should handle BadRequestException from service', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'test' };
      const error = new BadRequestException('Invalid search parameters');

      searchService.searchProducts.mockRejectedValue(error);

      await expect(controller.searchProducts(queryDto)).rejects.toThrow(
        'Invalid search parameters',
      );
    });

    it('should handle unexpected errors', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'test' };
      const error = new Error('Unexpected error');

      searchService.searchProducts.mockRejectedValue(error);

      await expect(controller.searchProducts(queryDto)).rejects.toThrow(
        'An unexpected error occurred',
      );
      expect(logger.logApiError).toHaveBeenCalledWith(
        '/customers/products/search',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });

    it('should return proper response structure', async () => {
      const queryDto: SearchProductsQueryDto = { query: 'water' };
      const detailedResponse: SearchProductsResponseDto = {
        products: [
          {
            id: '1',
            name: 'Premium Water Bottle',
            category: 'beverages',
            subcategory: '1L',
            price: 25.99,
            store: {
              id: 'store-1',
              name: 'Water Store Delhi',
              rating: 4.5,
              distance_km: 2.3,
            },
            is_available: true,
            stock_quantity: 150,
          },
          {
            id: '2',
            name: 'Mineral Water 500ml',
            category: 'beverages',
            subcategory: '500ml',
            price: 15.5,
            store: {
              id: 'store-2',
              name: 'City Mart',
              rating: 4.2,
              distance_km: 1.8,
            },
            is_available: true,
            stock_quantity: 200,
          },
        ],
        meta: {
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      searchService.searchProducts.mockResolvedValue(detailedResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('meta');
      expect(result.products).toBeInstanceOf(Array);
      expect(result.meta).toHaveProperty('pagination');
      expect(result.meta.pagination).toHaveProperty('page');
      expect(result.meta.pagination).toHaveProperty('limit');
      expect(result.meta.pagination).toHaveProperty('total');
      expect(result.meta.pagination).toHaveProperty('total_pages');
      expect(result.meta.pagination).toHaveProperty('has_next');
      expect(result.meta.pagination).toHaveProperty('has_prev');

      result.products.forEach((product) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('store');
        expect(product).toHaveProperty('is_available');
        expect(product).toHaveProperty('stock_quantity');
        expect(product.store).toHaveProperty('id');
        expect(product.store).toHaveProperty('name');
        expect(product.store).toHaveProperty('rating');
        expect(product.store).toHaveProperty('distance_km');
      });
    });

    it('should handle edge case with maximum limit', async () => {
      const queryDto: SearchProductsQueryDto = { limit: 100 };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should handle edge case with minimum limit', async () => {
      const queryDto: SearchProductsQueryDto = { limit: 1 };

      searchService.searchProducts.mockResolvedValue(mockResponse);

      const result = await controller.searchProducts(queryDto);

      expect(result).toEqual(mockResponse);
      expect(searchService.searchProducts).toHaveBeenCalledWith(queryDto);
    });

    it('should handle edge case with large page number', async () => {
      const queryDto: SearchProductsQueryDto = { page: 1000 };

      searchService.searchProducts.mockResolvedValue({
        products: [],
        meta: {
          pagination: {
            page: 1000,
            limit: 20,
            total: 50,
            total_pages: 3,
            has_next: false,
            has_prev: true,
          },
        },
      });

      const result = await controller.searchProducts(queryDto);

      expect(result.products).toHaveLength(0);
      expect(result.meta.pagination.page).toBe(1000);
    });
  });

  describe('Controller instantiation', () => {
    it('should be properly instantiated with service and logger', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CustomerSearchController);
    });
  });
});
