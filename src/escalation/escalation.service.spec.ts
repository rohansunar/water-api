import { Test, TestingModule } from '@nestjs/testing';
import { EscalationService } from './escalation.service';
import { PrismaClient } from '@prisma/client';
import { EscalationStatus } from '../common/interfaces/escalation.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DisputePriority } from '../common/interfaces/dispute.interface';

describe('EscalationService', () => {
  let service: EscalationService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EscalationService],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    prisma = (service as any).prisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEscalation', () => {
    const mockCreateDto = {
      disputeId: 'dispute-123',
      escalatedTo: 'senior_support',
      reason: 'Complex technical issue',
      priority: DisputePriority.HIGH,
    };
    const mockEscalatedBy = BigInt(1);

    it('should create an escalation successfully', async () => {
      const mockDispute = {
        id: BigInt(100),
      };

      const mockEscalation = {
        id: BigInt(1),
        disputeId: BigInt(100),
        escalatedBy: mockEscalatedBy,
        escalatedTo: mockCreateDto.escalatedTo,
        reason: mockCreateDto.reason,
        priority: mockCreateDto.priority,
        status: EscalationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.escalation, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.escalation, 'create').mockResolvedValue(mockEscalation as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue({} as any);

      const result = await service.createEscalation(mockCreateDto, mockEscalatedBy);

      expect(result.id).toBe(BigInt(1));
      expect(result.status).toBe(EscalationStatus.PENDING);
      expect(result.escalatedTo).toBe(mockCreateDto.escalatedTo);
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: BigInt(100) },
        data: { status: 'ESCALATED' },
      });
    });

    it('should throw NotFoundException if dispute not found', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(service.createEscalation(mockCreateDto, mockEscalatedBy))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if escalation already exists', async () => {
      const mockDispute = { id: BigInt(100) };
      const existingEscalation = { id: BigInt(1), status: EscalationStatus.PENDING };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.escalation, 'findFirst').mockResolvedValue(existingEscalation as any);

      await expect(service.createEscalation(mockCreateDto, mockEscalatedBy))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveEscalation', () => {
    const mockEscalationId = BigInt(1);
    const mockResolvedBy = BigInt(2);
    const mockResolveDto = {
      resolution: 'Issue resolved with compensation',
      notes: 'Customer satisfied',
    };

    it('should resolve escalation successfully', async () => {
      const mockEscalation = {
        id: mockEscalationId,
        disputeId: BigInt(100),
        status: EscalationStatus.PENDING,
        dispute: { id: BigInt(100) },
      };

      const mockUpdatedEscalation = {
        ...mockEscalation,
        status: EscalationStatus.RESOLVED,
        resolution: mockResolveDto.resolution,
        resolvedBy: mockResolvedBy,
        resolvedAt: new Date(),
      };

      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(mockEscalation as any);
      jest.spyOn(prisma.escalation, 'update').mockResolvedValue(mockUpdatedEscalation as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue({} as any);

      const result = await service.resolveEscalation(mockEscalationId, mockResolveDto, mockResolvedBy);

      expect(result.status).toBe(EscalationStatus.RESOLVED);
      expect(result.resolution).toBe(mockResolveDto.resolution);
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: BigInt(100) },
        data: {
          status: 'RESOLVED',
          resolution: mockResolveDto.resolution,
          resolvedBy: mockResolvedBy,
          resolvedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if escalation not found', async () => {
      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(null);

      await expect(service.resolveEscalation(mockEscalationId, mockResolveDto, mockResolvedBy))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if escalation is already resolved', async () => {
      const mockEscalation = {
        id: mockEscalationId,
        status: EscalationStatus.RESOLVED,
      };

      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(mockEscalation as any);

      await expect(service.resolveEscalation(mockEscalationId, mockResolveDto, mockResolvedBy))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEscalationStatus', () => {
    const mockEscalationId = BigInt(1);
    const mockUpdatedBy = BigInt(2);
    const mockUpdateDto = {
      status: EscalationStatus.IN_REVIEW,
    };

    it('should update escalation status successfully', async () => {
      const mockEscalation = {
        id: mockEscalationId,
        status: EscalationStatus.PENDING,
      };

      const mockUpdatedEscalation = {
        ...mockEscalation,
        status: EscalationStatus.IN_REVIEW,
      };

      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(mockEscalation as any);
      jest.spyOn(prisma.escalation, 'update').mockResolvedValue(mockUpdatedEscalation as any);

      const result = await service.updateEscalationStatus(mockEscalationId, mockUpdateDto, mockUpdatedBy);

      expect(result.status).toBe(EscalationStatus.IN_REVIEW);
    });
  });

  describe('getEscalations', () => {
    const mockQuery = {
      status: EscalationStatus.PENDING,
      priority: DisputePriority.HIGH,
      escalatedTo: 'senior_support',
      disputeId: 'dispute-123',
      page: 1,
      limit: 10,
    };

    it('should return paginated escalations with filters', async () => {
      const mockDispute = {
        id: BigInt(100),
      };

      const mockEscalations = [
        {
          id: BigInt(1),
          status: EscalationStatus.PENDING,
          priority: DisputePriority.HIGH,
          escalatedTo: 'senior_support',
          dispute: {
            order: {
              customer: { name: 'John Doe' },
              vendor: { name: 'Vendor Inc' },
            },
          },
          escalator: { name: 'Admin User' },
          resolver: null,
        },
      ];

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.escalation, 'findMany').mockResolvedValue(mockEscalations as any);
      jest.spyOn(prisma.escalation, 'count').mockResolvedValue(1);

      const result = await service.getEscalations(mockQuery);

      expect(result.escalations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.escalations[0].id).toBe(BigInt(1));
    });

    it('should apply all filters correctly', async () => {
      const mockDispute = {
        id: BigInt(100),
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.escalation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.escalation, 'count').mockResolvedValue(0);

      await service.getEscalations(mockQuery);

      expect(prisma.escalation.findMany).toHaveBeenCalledWith({
        where: {
          status: EscalationStatus.PENDING,
          priority: DisputePriority.HIGH,
          escalatedTo: 'senior_support',
          disputeId: BigInt(100),
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getEscalationById', () => {
    it('should return escalation by id', async () => {
      const mockEscalation = {
        id: BigInt(1),
        status: EscalationStatus.PENDING,
        dispute: {
          order: {
            customer: { name: 'John Doe' },
            vendor: { name: 'Vendor Inc' },
          },
        },
        escalator: { name: 'Admin User' },
        resolver: null,
      };

      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(mockEscalation as any);

      const result = await service.getEscalationById(BigInt(1));

      expect(result.id).toBe(BigInt(1));
      expect(result.status).toBe(EscalationStatus.PENDING);
    });

    it('should throw NotFoundException if escalation not found', async () => {
      jest.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(null);

      await expect(service.getEscalationById(BigInt(999)))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getEscalationsByDispute', () => {
    it('should return escalations for a dispute', async () => {
      const mockEscalations = [
        {
          id: BigInt(1),
          reason: 'Complex issue',
          escalator: { name: 'Admin' },
          resolver: null,
        },
      ];

      jest.spyOn(prisma.escalation, 'findMany').mockResolvedValue(mockEscalations as any);

      const result = await service.getEscalationsByDispute(BigInt(100));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BigInt(1));
    });
  });
});