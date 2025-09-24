import { Test, TestingModule } from '@nestjs/testing';
import { DisputeService } from './dispute.service';
import { RefundService } from '../refund/refund.service';
import { PrismaClient } from '@prisma/client';
import { DisputeStatus, DisputePriority } from '../common/interfaces/dispute.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DisputeService', () => {
  let service: DisputeService;
  let prisma: PrismaClient;
  let refundService: RefundService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        {
          provide: RefundService,
          useValue: {
            createRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
    prisma = (service as any).prisma;
    refundService = module.get<RefundService>(RefundService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDispute', () => {
    const mockOrderId = 'order-123';
    const mockRaisedBy = BigInt(1);
    const mockRaisedByType = 'customer' as const;
    const mockCreateDto = {
      orderId: 'order-123',
      reason: 'Wrong product delivered',
      description: 'Received 20L jar instead of 10L',
      category: 'WRONG_ITEM' as any,
      priority: DisputePriority.HIGH,
      evidence: { images: ['img1.jpg'] },
    };

    it('should create a dispute successfully', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: mockOrderId,
        createdAt: new Date(),
        customerId: mockRaisedBy,
      };

      const mockDispute = {
        id: BigInt(1),
        orderId: mockOrder.id,
        orderCreatedAt: mockOrder.createdAt,
        raisedBy: mockRaisedBy,
        raisedByType: mockRaisedByType,
        reason: mockCreateDto.reason,
        description: mockCreateDto.description,
        category: mockCreateDto.category,
        priority: mockCreateDto.priority,
        evidence: mockCreateDto.evidence,
        status: DisputeStatus.OPEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.dispute, 'create').mockResolvedValue(mockDispute as any);

      const result = await service.createDispute(mockOrderId, mockRaisedBy, mockRaisedByType, mockCreateDto);

      expect(result.id).toBe(BigInt(1));
      expect(result.status).toBe(DisputeStatus.OPEN);
      expect(result.priority).toBe(DisputePriority.HIGH);
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

      await expect(service.createDispute('invalid-order', mockRaisedBy, mockRaisedByType, mockCreateDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if customer tries to dispute others order', async () => {
      const mockOrder = {
        id: BigInt(100),
        customerId: BigInt(999), // Different customer
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);

      await expect(service.createDispute(mockOrderId, mockRaisedBy, 'customer', mockCreateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vendor tries to dispute others order', async () => {
      const mockOrder = {
        id: BigInt(100),
        vendorId: BigInt(999), // Different vendor
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);

      await expect(service.createDispute(mockOrderId, mockRaisedBy, 'vendor', mockCreateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dispute already exists', async () => {
      const mockOrder = {
        id: BigInt(100),
        customerId: mockRaisedBy,
      };

      const existingDispute = {
        id: BigInt(1),
        status: DisputeStatus.OPEN,
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(existingDispute as any);

      await expect(service.createDispute(mockOrderId, mockRaisedBy, mockRaisedByType, mockCreateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should set default priority to MEDIUM if not provided', async () => {
      const dtoWithoutPriority = { ...mockCreateDto, priority: undefined };
      const mockOrder = {
        id: BigInt(100),
        customerId: mockRaisedBy,
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.dispute, 'create').mockResolvedValue({
        id: BigInt(1),
        priority: DisputePriority.MEDIUM,
      } as any);

      await service.createDispute(mockOrderId, mockRaisedBy, mockRaisedByType, dtoWithoutPriority);

      expect(prisma.dispute.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ priority: DisputePriority.MEDIUM }),
      });
    });
  });

  describe('resolveDispute', () => {
    const mockDisputeId = BigInt(1);
    const mockResolvedBy = BigInt(2);
    const mockResolveDto = {
      resolution: 'Refund issued for wrong product',
      notes: 'Customer will receive full refund',
    };

    it('should resolve dispute successfully', async () => {
      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.OPEN,
        order: {
          id: BigInt(100),
          orderUuid: 'order-123',
          totalAmount: 1000,
        },
      };

      const mockUpdatedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
        resolution: mockResolveDto.resolution,
        resolvedBy: mockResolvedBy,
        resolvedAt: new Date(),
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue(mockUpdatedDispute as any);
      jest.spyOn(refundService, 'createRefund').mockResolvedValue({} as any);

      const result = await service.resolveDispute(mockDisputeId, mockResolveDto, mockResolvedBy);

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolution).toBe(mockResolveDto.resolution);
    });

    it('should create refund if resolution mentions refund', async () => {
      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.OPEN,
        reason: 'Wrong product',
        order: {
          id: BigInt(100),
          orderUuid: 'order-123',
          totalAmount: 1000,
        },
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue({ ...mockDispute, status: DisputeStatus.RESOLVED } as any);
      jest.spyOn(refundService, 'createRefund').mockResolvedValue({} as any);

      await service.resolveDispute(mockDisputeId, mockResolveDto, mockResolvedBy);

      expect(refundService.createRefund).toHaveBeenCalledWith(
        'order-123',
        {
          orderId: 'order-123',
          amount: 1000,
          reason: 'Dispute resolution: Wrong product',
          notes: mockResolveDto.notes,
        },
        mockResolvedBy,
      );
    });

    it('should not create refund if resolution does not mention refund', async () => {
      const resolveDto = {
        resolution: 'Product will be replaced',
        notes: 'Replacement will be sent',
      };

      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.OPEN,
        order: { id: BigInt(100) },
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue({ ...mockDispute, status: DisputeStatus.RESOLVED } as any);

      await service.resolveDispute(mockDisputeId, resolveDto, mockResolvedBy);

      expect(refundService.createRefund).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if dispute is already resolved', async () => {
      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.RESOLVED,
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);

      await expect(service.resolveDispute(mockDisputeId, mockResolveDto, mockResolvedBy))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDisputeStatus', () => {
    const mockDisputeId = BigInt(1);
    const mockUpdatedBy = BigInt(2);
    const mockUpdateDto = {
      status: DisputeStatus.INVESTIGATING,
    };

    it('should update dispute status successfully', async () => {
      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.OPEN,
      };

      const mockUpdatedDispute = {
        ...mockDispute,
        status: DisputeStatus.INVESTIGATING,
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue(mockUpdatedDispute as any);

      const result = await service.updateDisputeStatus(mockDisputeId, mockUpdateDto, mockUpdatedBy);

      expect(result.status).toBe(DisputeStatus.INVESTIGATING);
    });
  });

  describe('escalateDispute', () => {
    const mockDisputeId = BigInt(1);
    const mockEscalatedBy = BigInt(2);
    const mockEscalatedTo = 'senior_support';
    const mockReason = 'Complex issue requiring higher authority';

    it('should escalate dispute successfully', async () => {
      const mockDispute = {
        id: mockDisputeId,
        status: DisputeStatus.OPEN,
      };

      const mockUpdatedDispute = {
        ...mockDispute,
        status: DisputeStatus.ESCALATED,
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue(mockUpdatedDispute as any);
      jest.spyOn(prisma.escalation, 'create').mockResolvedValue({} as any);

      const result = await service.escalateDispute(mockDisputeId, mockEscalatedBy, mockEscalatedTo, mockReason);

      expect(result.status).toBe(DisputeStatus.ESCALATED);
      expect(prisma.escalation.create).toHaveBeenCalledWith({
        data: {
          disputeId: mockDisputeId,
          escalatedBy: mockEscalatedBy,
          escalatedTo: mockEscalatedTo,
          reason: mockReason,
          priority: DisputePriority.HIGH,
          status: 'PENDING',
        },
      });
    });
  });

  describe('getDisputes', () => {
    const mockQuery = {
      status: DisputeStatus.OPEN,
      priority: DisputePriority.HIGH,
      category: 'WRONG_ITEM' as any,
      orderId: 'order-123',
      page: 1,
      limit: 10,
    };

    it('should return paginated disputes with filters', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: 'order-123',
        createdAt: new Date(),
      };

      const mockDisputes = [
        {
          id: BigInt(1),
          status: DisputeStatus.OPEN,
          priority: DisputePriority.HIGH,
          category: 'product_mismatch',
          order: {
            customer: { name: 'John Doe' },
            vendor: { name: 'Vendor Inc' },
          },
          resolver: { name: 'Admin User' },
        },
      ];

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findMany').mockResolvedValue(mockDisputes as any);
      jest.spyOn(prisma.dispute, 'count').mockResolvedValue(1);

      const result = await service.getDisputes(mockQuery);

      expect(result.disputes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.disputes[0].id).toBe(BigInt(1));
    });

    it('should apply all filters correctly', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: 'order-123',
        createdAt: new Date(),
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.dispute, 'count').mockResolvedValue(0);

      await service.getDisputes(mockQuery);

      expect(prisma.dispute.findMany).toHaveBeenCalledWith({
        where: {
          status: DisputeStatus.OPEN,
          priority: DisputePriority.HIGH,
          category: 'product_mismatch',
          orderId: BigInt(100),
          orderCreatedAt: mockOrder.createdAt,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getDisputeById', () => {
    it('should return dispute by id', async () => {
      const mockDispute = {
        id: BigInt(1),
        status: DisputeStatus.OPEN,
        order: {
          customer: { name: 'John Doe' },
          vendor: { name: 'Vendor Inc' },
        },
        resolver: { name: 'Admin User' },
        escalations: [],
      };

      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(mockDispute as any);

      const result = await service.getDisputeById(BigInt(1));

      expect(result.id).toBe(BigInt(1));
      expect(result.status).toBe(DisputeStatus.OPEN);
    });

    it('should throw NotFoundException if dispute not found', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null);

      await expect(service.getDisputeById(BigInt(999)))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getDisputesByOrder', () => {
    it('should return disputes for an order', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: 'order-123',
        createdAt: new Date(),
      };

      const mockDisputes = [
        {
          id: BigInt(1),
          reason: 'Wrong product',
          resolver: { name: 'Admin' },
        },
      ];

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.dispute, 'findMany').mockResolvedValue(mockDisputes as any);

      const result = await service.getDisputesByOrder('order-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BigInt(1));
    });
  });

  describe('extractRefundAmount', () => {
    it('should extract amount from resolution text', () => {
      const service = new DisputeService({} as any);
      const result = (service as any).extractRefundAmount('Refund ₹500 to customer');
      expect(result).toBe(500);
    });

    it('should return null if no amount found', () => {
      const service = new DisputeService({} as any);
      const result = (service as any).extractRefundAmount('Replace the product');
      expect(result).toBeNull();
    });
  });
});