import { Test, TestingModule } from '@nestjs/testing';
import { ProductModerationService } from './product-moderation.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaClient } from '@prisma/client';

describe('ProductModerationService', () => {
  let service: ProductModerationService;
  let prisma: PrismaClient;
  let logger: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductModerationService,
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            logBusinessEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductModerationService>(ProductModerationService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);

    // Get the prisma instance from the service
    prisma = (service as any).prisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductsForModeration', () => {
    it('should return products for moderation', async () => {
      const mockProducts = [
        {
          id: BigInt(1),
          vendorId: BigInt(1),
          name: 'Test Product',
          category: 'water_jar',
          subcategory: '20L',
          basePrice: 30,
          description: 'Test description',
          imageUrl: 'test.jpg',
          moderationStatus: 'PENDING',
          flaggedReason: null,
          autoFlagged: false,
          complianceIssues: null,
          createdAt: new Date(),
          moderatedAt: null,
          vendor: { id: BigInt(1), name: 'Test Vendor' },
          moderator: null,
        },
      ];

      jest.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any);
      jest.spyOn(prisma.product, 'count').mockResolvedValue(1);

      const result = await service.getProductsForModeration({});

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.products[0].name).toBe('Test Product');
    });
  });

  describe('approveProduct', () => {
    it('should approve a product successfully', async () => {
      const mockProduct = {
        id: BigInt(1),
        vendorId: BigInt(1),
        name: 'Test Product',
        moderationStatus: 'PENDING',
        vendor: { id: BigInt(1) },
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.product, 'update').mockResolvedValue({ ...mockProduct, moderationStatus: 'APPROVED' } as any);

      const result = await service.approveProduct('1', 'admin-1', { notes: 'Approved' });

      expect(result.message).toBe('Product approved successfully');
      expect(logger.logBusinessEvent).toHaveBeenCalledWith('product_approved', expect.any(Object));
    });

    it('should throw error if product is already approved', async () => {
      const mockProduct = {
        id: BigInt(1),
        vendorId: BigInt(1),
        name: 'Test Product',
        moderationStatus: 'APPROVED',
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

      await expect(service.approveProduct('1', 'admin-1', {})).rejects.toThrow('Product is already approved');
    });
  });

  describe('rejectProduct', () => {
    it('should reject a product successfully', async () => {
      const mockProduct = {
        id: BigInt(1),
        vendorId: BigInt(1),
        name: 'Test Product',
        moderationStatus: 'PENDING',
        vendor: { id: BigInt(1) },
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.product, 'update').mockResolvedValue({ ...mockProduct, moderationStatus: 'REJECTED' } as any);

      const result = await service.rejectProduct('1', 'admin-1', { reason: 'Invalid product' });

      expect(result.message).toBe('Product rejected successfully');
      expect(logger.logBusinessEvent).toHaveBeenCalledWith('product_rejected', expect.any(Object));
    });
  });

  describe('bulkModerateProducts', () => {
    it('should bulk approve products', async () => {
      const mockProducts = [
        { id: BigInt(1), vendorId: BigInt(1), name: 'Product 1' },
        { id: BigInt(2), vendorId: BigInt(1), name: 'Product 2' },
      ];

      jest.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any);
      jest.spyOn(prisma.product, 'updateMany').mockResolvedValue({ count: 2 });

      const result = await service.bulkModerateProducts('admin-1', {
        productIds: ['1', '2'],
        action: 'approve',
      });

      expect(result.message).toBe('Successfully approved 2 product(s)');
      expect(result.processed).toBe(2);
    });

    it('should throw error if reject action without reason', async () => {
      await expect(service.bulkModerateProducts('admin-1', {
        productIds: ['1'],
        action: 'reject',
      })).rejects.toThrow('Reason is required for rejection');
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      jest.spyOn(prisma.product, 'count')
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // approved
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(1) // flagged
        .mockResolvedValueOnce(3) // pending today
        .mockResolvedValueOnce(2) // approved today
        .mockResolvedValueOnce(1); // rejected today

      const result = await service.getModerationStats();

      expect(result.totalPending).toBe(5);
      expect(result.totalApproved).toBe(10);
      expect(result.totalRejected).toBe(2);
      expect(result.totalFlagged).toBe(1);
    });
  });

  describe('autoFlagProduct', () => {
    it('should flag product with compliance issues', async () => {
      const mockProduct = {
        id: BigInt(1),
        name: 'Test Product',
        description: 'Test description',
        category: 'invalid_category',
        basePrice: 1000, // Too high
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.product, 'update').mockResolvedValue({ ...mockProduct, moderationStatus: 'FLAGGED' } as any);

      await service.autoFlagProduct('1');

      expect(logger.logBusinessEvent).toHaveBeenCalledWith('product_auto_flagged', expect.any(Object));
    });

    it('should set product to pending if no issues', async () => {
      const mockProduct = {
        id: BigInt(1),
        name: 'Valid Product',
        description: 'Valid description with enough length',
        category: 'water_jar',
        basePrice: 30,
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.product, 'update').mockResolvedValue({ ...mockProduct, moderationStatus: 'PENDING' } as any);

      await service.autoFlagProduct('1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          moderationStatus: 'PENDING',
          autoFlagged: false,
          complianceIssues: null,
        },
      });
    });
  });
});