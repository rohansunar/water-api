import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaClient } from '@prisma/client';
import { CommissionScope } from '../common/interfaces/commission.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CommissionService', () => {
  let service: CommissionService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionService],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prisma = (service as any).prisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCommissionRule', () => {
    const mockAdminId = BigInt(1);
    const mockCreateDto = {
      scope: CommissionScope.PRODUCT,
      scopeId: 'prod-123',
      percentage: 15,
      priority: 1,
      isActive: true,
    };

    it('should create a commission rule successfully', async () => {
      const mockRule = {
        id: BigInt(1),
        ...mockCreateDto,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'create').mockResolvedValue(mockRule as any);

      const result = await service.createCommissionRule(mockCreateDto, mockAdminId);

      expect(result.id).toBe('1');
      expect(result.scope).toBe(mockCreateDto.scope);
      expect(result.percentage).toBe(15);
      expect(prisma.commissionRule.create).toHaveBeenCalledWith({
        data: {
          scope: mockCreateDto.scope,
          scopeId: mockCreateDto.scopeId,
          percentage: mockCreateDto.percentage,
          priority: mockCreateDto.priority,
          isActive: mockCreateDto.isActive,
          createdBy: mockAdminId,
        },
      });
    });

    it('should throw BadRequestException for PRODUCT scope without scopeId', async () => {
      const invalidDto = { ...mockCreateDto, scopeId: undefined };

      await expect(service.createCommissionRule(invalidDto, mockAdminId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for GLOBAL scope with scopeId', async () => {
      const invalidDto = { ...mockCreateDto, scope: CommissionScope.GLOBAL, scopeId: 'invalid' };

      await expect(service.createCommissionRule(invalidDto, mockAdminId))
        .rejects.toThrow(BadRequestException);
    });

    it('should set default priority to 0 if not provided', async () => {
      const dtoWithoutPriority = { ...mockCreateDto, priority: undefined };
      const mockRule = {
        id: BigInt(1),
        ...dtoWithoutPriority,
        priority: 0,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'create').mockResolvedValue(mockRule as any);

      await service.createCommissionRule(dtoWithoutPriority, mockAdminId);

      expect(prisma.commissionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ priority: 0 }),
      });
    });

    it('should set isActive to true by default', async () => {
      const dtoWithoutActive = { ...mockCreateDto, isActive: undefined };
      const mockRule = {
        id: BigInt(1),
        ...dtoWithoutActive,
        isActive: true,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'create').mockResolvedValue(mockRule as any);

      await service.createCommissionRule(dtoWithoutActive, mockAdminId);

      expect(prisma.commissionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: true }),
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.commissionRule, 'create').mockRejectedValue(new Error('Database error'));

      await expect(service.createCommissionRule(mockCreateDto, mockAdminId))
        .rejects.toThrow('Database error');
    });
  });

  describe('getCommissionRules', () => {
    it('should return all commission rules without filters', async () => {
      const mockRules = [
        {
          id: BigInt(1),
          scope: CommissionScope.GLOBAL,
          percentage: 10,
          priority: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(mockRules as any);

      const result = await service.getCommissionRules();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(prisma.commissionRule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { scope: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    });

    it('should filter by scope', async () => {
      const mockRules = [];
      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(mockRules as any);

      await service.getCommissionRules(CommissionScope.PRODUCT);

      expect(prisma.commissionRule.findMany).toHaveBeenCalledWith({
        where: { scope: CommissionScope.PRODUCT },
        orderBy: expect.any(Array),
      });
    });

    it('should filter by isActive', async () => {
      const mockRules = [];
      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(mockRules as any);

      await service.getCommissionRules(undefined, false);

      expect(prisma.commissionRule.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        orderBy: expect.any(Array),
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.commissionRule, 'findMany').mockRejectedValue(new Error('Database error'));

      await expect(service.getCommissionRules())
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getCommissionRuleById', () => {
    it('should return commission rule by id', async () => {
      const mockRule = {
        id: BigInt(1),
        scope: CommissionScope.GLOBAL,
        percentage: 10,
        priority: 0,
        isActive: true,
        createdBy: BigInt(1),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'findUnique').mockResolvedValue(mockRule as any);

      const result = await service.getCommissionRuleById(BigInt(1));

      expect(result.id).toBe('1');
      expect(result.percentage).toBe(10);
    });

    it('should throw NotFoundException if rule not found', async () => {
      jest.spyOn(prisma.commissionRule, 'findUnique').mockResolvedValue(null);

      await expect(service.getCommissionRuleById(BigInt(999)))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCommissionRule', () => {
    const mockUpdateDto = {
      percentage: 20,
      priority: 2,
      isActive: false,
    };

    it('should update commission rule successfully', async () => {
      const mockExistingRule = {
        id: BigInt(1),
        scope: CommissionScope.GLOBAL,
        scopeId: null,
      };

      const mockUpdatedRule = {
        id: BigInt(1),
        ...mockExistingRule,
        ...mockUpdateDto,
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'findUnique').mockResolvedValue(mockExistingRule as any);
      jest.spyOn(prisma.commissionRule, 'update').mockResolvedValue(mockUpdatedRule as any);

      const result = await service.updateCommissionRule(BigInt(1), mockUpdateDto);

      expect(result.percentage).toBe(20);
      expect(result.priority).toBe(2);
      expect(result.isActive).toBe(false);
    });

    it('should validate scopeId when updating scope to PRODUCT', async () => {
      const updateDto = {
        scope: CommissionScope.PRODUCT,
        scopeId: undefined, // Missing scopeId
      };

      const mockExistingRule = {
        id: BigInt(1),
        scope: CommissionScope.GLOBAL,
        scopeId: null,
      };

      jest.spyOn(prisma.commissionRule, 'findUnique').mockResolvedValue(mockExistingRule as any);

      await expect(service.updateCommissionRule(BigInt(1), updateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should use existing scopeId if not provided in update', async () => {
      const updateDto = {
        scope: CommissionScope.PRODUCT,
        scopeId: undefined,
      };

      const mockExistingRule = {
        id: BigInt(1),
        scope: CommissionScope.GLOBAL,
        scopeId: 'existing-id',
      };

      const mockUpdatedRule = {
        id: BigInt(1),
        scope: CommissionScope.PRODUCT,
        scopeId: 'existing-id',
        percentage: 15,
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.commissionRule, 'findUnique').mockResolvedValue(mockExistingRule as any);
      jest.spyOn(prisma.commissionRule, 'update').mockResolvedValue(mockUpdatedRule as any);

      await service.updateCommissionRule(BigInt(1), updateDto);

      expect(prisma.commissionRule.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: expect.objectContaining({ scopeId: 'existing-id' }),
      });
    });
  });

  describe('deleteCommissionRule', () => {
    it('should deactivate commission rule (soft delete)', async () => {
      jest.spyOn(prisma.commissionRule, 'update').mockResolvedValue({} as any);

      const result = await service.deleteCommissionRule(BigInt(1));

      expect(result.message).toBe('Commission rule deactivated successfully');
      expect(prisma.commissionRule.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { isActive: false },
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.commissionRule, 'update').mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCommissionRule(BigInt(1)))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('calculateCommission', () => {
    const mockRules = [
      {
        id: BigInt(1),
        scope: CommissionScope.PRODUCT,
        scopeId: 'prod-123',
        percentage: 15,
        priority: 3,
        isActive: true,
      },
      {
        id: BigInt(2),
        scope: CommissionScope.CATEGORY,
        scopeId: 'water_jar',
        percentage: 12,
        priority: 2,
        isActive: true,
      },
      {
        id: BigInt(3),
        scope: CommissionScope.VENDOR,
        scopeId: 'vendor-456',
        percentage: 10,
        priority: 1,
        isActive: true,
      },
      {
        id: BigInt(4),
        scope: CommissionScope.GLOBAL,
        scopeId: null,
        percentage: 8,
        priority: 0,
        isActive: true,
      },
    ];

    beforeEach(() => {
      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(mockRules as any);
    });

    it('should calculate commission using PRODUCT rule (highest priority)', async () => {
      const result = await service.calculateCommission('prod-123', 'water_jar', 'vendor-456', 1000);

      expect(result.ruleId).toBe('1');
      expect(result.percentage).toBe(15);
      expect(result.amount).toBe(150);
      expect(result.scope).toBe(CommissionScope.PRODUCT);
    });

    it('should calculate commission using CATEGORY rule when no PRODUCT rule matches', async () => {
      const result = await service.calculateCommission('prod-999', 'water_jar', 'vendor-456', 1000);

      expect(result.ruleId).toBe('2');
      expect(result.percentage).toBe(12);
      expect(result.amount).toBe(120);
      expect(result.scope).toBe(CommissionScope.CATEGORY);
    });

    it('should calculate commission using VENDOR rule when no higher priority rules match', async () => {
      const result = await service.calculateCommission('prod-999', 'other_category', 'vendor-456', 1000);

      expect(result.ruleId).toBe('3');
      expect(result.percentage).toBe(10);
      expect(result.amount).toBe(100);
      expect(result.scope).toBe(CommissionScope.VENDOR);
    });

    it('should calculate commission using GLOBAL rule as fallback', async () => {
      const result = await service.calculateCommission('prod-999', 'other_category', 'vendor-999', 1000);

      expect(result.ruleId).toBe('4');
      expect(result.percentage).toBe(8);
      expect(result.amount).toBe(80);
      expect(result.scope).toBe(CommissionScope.GLOBAL);
    });

    it('should use default 10% commission when no rules found', async () => {
      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue([]);

      const result = await service.calculateCommission('prod-999', 'category', 'vendor', 1000);

      expect(result.ruleId).toBe('0');
      expect(result.percentage).toBe(10);
      expect(result.amount).toBe(100);
      expect(result.scope).toBe(CommissionScope.GLOBAL);
    });

    it('should handle inactive rules by excluding them', async () => {
      const inactiveRules = mockRules.map(rule => ({ ...rule, isActive: false }));
      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(inactiveRules as any);

      const result = await service.calculateCommission('prod-123', 'water_jar', 'vendor-456', 1000);

      expect(result.ruleId).toBe('0'); // Default rule
      expect(result.percentage).toBe(10);
    });

    it('should handle decimal percentages correctly', async () => {
      const decimalRules = [
        {
          id: BigInt(1),
          scope: CommissionScope.GLOBAL,
          scopeId: null,
          percentage: 7.5,
          priority: 0,
          isActive: true,
        },
      ];

      jest.spyOn(prisma.commissionRule, 'findMany').mockResolvedValue(decimalRules as any);

      const result = await service.calculateCommission('prod-123', 'water_jar', 'vendor-456', 200);

      expect(result.percentage).toBe(7.5);
      expect(result.amount).toBe(15); // 200 * 0.075
    });

    it('should handle zero order amount', async () => {
      const result = await service.calculateCommission('prod-123', 'water_jar', 'vendor-456', 0);

      expect(result.amount).toBe(0);
    });

    it('should handle large order amounts', async () => {
      const result = await service.calculateCommission('prod-123', 'water_jar', 'vendor-456', 1000000);

      expect(result.amount).toBe(150000); // 1,000,000 * 0.15
    });
  });
});