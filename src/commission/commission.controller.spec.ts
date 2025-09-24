import { Test, TestingModule } from '@nestjs/testing';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CommissionScope } from '../common/interfaces/commission.interface';

describe('CommissionController', () => {
  let controller: CommissionController;
  let service: CommissionService;

  const mockUser = {
    id: '1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockCommissionRule = {
    id: '1',
    scope: CommissionScope.GLOBAL,
    percentage: 10,
    priority: 0,
    isActive: true,
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionController],
      providers: [
        {
          provide: CommissionService,
          useValue: {
            createCommissionRule: jest.fn(),
            getCommissionRules: jest.fn(),
            getCommissionRuleById: jest.fn(),
            updateCommissionRule: jest.fn(),
            deleteCommissionRule: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommissionController>(CommissionController);
    service = module.get<CommissionService>(CommissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCommissionRules', () => {
    it('should return commission rules', async () => {
      const mockRules = [mockCommissionRule];
      jest.spyOn(service, 'getCommissionRules').mockResolvedValue(mockRules);

      const result = await controller.getCommissionRules(mockUser as any, CommissionScope.GLOBAL, true);

      expect(result).toEqual(mockRules);
      expect(service.getCommissionRules).toHaveBeenCalledWith(CommissionScope.GLOBAL, true);
    });

    it('should handle undefined filters', async () => {
      const mockRules = [mockCommissionRule];
      jest.spyOn(service, 'getCommissionRules').mockResolvedValue(mockRules);

      const result = await controller.getCommissionRules(mockUser as any, undefined, undefined);

      expect(result).toEqual(mockRules);
      expect(service.getCommissionRules).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('createCommissionRule', () => {
    const mockCreateDto = {
      scope: CommissionScope.PRODUCT,
      scopeId: 'prod-123',
      percentage: 15,
      priority: 1,
      isActive: true,
    };

    it('should create commission rule', async () => {
      jest.spyOn(service, 'createCommissionRule').mockResolvedValue(mockCommissionRule);

      const result = await controller.createCommissionRule(mockCreateDto, mockUser as any);

      expect(result).toEqual(mockCommissionRule);
      expect(service.createCommissionRule).toHaveBeenCalledWith(mockCreateDto, BigInt(mockUser.id));
    });
  });

  describe('getCommissionRuleById', () => {
    it('should return commission rule by id', async () => {
      jest.spyOn(service, 'getCommissionRuleById').mockResolvedValue(mockCommissionRule);

      const result = await controller.getCommissionRuleById('1', mockUser);

      expect(result).toEqual(mockCommissionRule);
      expect(service.getCommissionRuleById).toHaveBeenCalledWith(BigInt(1));
    });
  });

  describe('updateCommissionRule', () => {
    const mockUpdateDto = {
      percentage: 20,
      priority: 2,
    };

    it('should update commission rule', async () => {
      const updatedRule = { ...mockCommissionRule, percentage: 20, priority: 2 };
      jest.spyOn(service, 'updateCommissionRule').mockResolvedValue(updatedRule);

      const result = await controller.updateCommissionRule('1', mockUpdateDto, mockUser);

      expect(result).toEqual(updatedRule);
      expect(service.updateCommissionRule).toHaveBeenCalledWith(BigInt(1), mockUpdateDto);
    });
  });

  describe('deleteCommissionRule', () => {
    it('should delete commission rule', async () => {
      const mockResponse = { message: 'Commission rule deactivated successfully' };
      jest.spyOn(service, 'deleteCommissionRule').mockResolvedValue(mockResponse);

      const result = await controller.deleteCommissionRule('1', mockUser);

      expect(result).toEqual(mockResponse);
      expect(service.deleteCommissionRule).toHaveBeenCalledWith(BigInt(1));
    });
  });
});