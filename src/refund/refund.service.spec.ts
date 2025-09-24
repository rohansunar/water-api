import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from './refund.service';
import { LedgerService } from '../ledger/ledger.service';
import { UserService } from '../modules/user/services/user.service';
import { PrismaClient } from '@prisma/client';
import { RefundStatus } from '../common/interfaces/refund.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerEntryType } from '../common/interfaces/ledger.interface';

describe('RefundService', () => {
  let service: RefundService;
  let prisma: PrismaClient;
  let ledgerService: LedgerService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        {
          provide: LedgerService,
          useValue: {
            createLedgerEntry: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            updateWalletBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prisma = (service as any).prisma;
    ledgerService = module.get<LedgerService>(LedgerService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefund', () => {
    const mockOrderId = 'order-123';
    const mockCreateDto = {
      orderId: 'order-123',
      amount: 500,
      reason: 'Product damaged',
      notes: 'Customer reported damage',
    };
    const mockCreatedBy = BigInt(1);

    it('should create a refund successfully', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: mockOrderId,
        totalAmount: 1000,
        createdAt: new Date(),
        customerId: BigInt(2),
        vendorId: BigInt(3),
      };

      const mockRefund = {
        id: BigInt(1),
        orderId: mockOrder.id,
        orderCreatedAt: mockOrder.createdAt,
        amount: 500,
        reason: mockCreateDto.reason,
        notes: mockCreateDto.notes,
        status: RefundStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.refund, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.refund, 'create').mockResolvedValue(mockRefund as any);

      const result = await service.createRefund(mockOrderId, mockCreateDto, mockCreatedBy);

      expect(result.id).toBe(1);
      expect(result.amount).toBe(500);
      expect(result.status).toBe(RefundStatus.PENDING);
      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: {
          orderId: mockOrder.id,
          orderCreatedAt: mockOrder.createdAt,
          amount: mockCreateDto.amount,
          reason: mockCreateDto.reason,
          notes: mockCreateDto.notes,
          status: RefundStatus.PENDING,
        },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

      await expect(service.createRefund('invalid-order', mockCreateDto, mockCreatedBy))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund already exists for order', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: mockOrderId,
        totalAmount: 1000,
        createdAt: new Date(),
      };

      const existingRefund = {
        id: BigInt(1),
        status: RefundStatus.PENDING,
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.refund, 'findFirst').mockResolvedValue(existingRefund as any);

      await expect(service.createRefund(mockOrderId, mockCreateDto, mockCreatedBy))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund amount exceeds order total', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: mockOrderId,
        totalAmount: 300, // Less than refund amount
        createdAt: new Date(),
      };

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.refund, 'findFirst').mockResolvedValue(null);

      await expect(service.createRefund(mockOrderId, mockCreateDto, mockCreatedBy))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockRejectedValue(new Error('Database error'));

      await expect(service.createRefund(mockOrderId, mockCreateDto, mockCreatedBy))
        .rejects.toThrow('Database error');
    });
  });

  describe('approveRefund', () => {
    const mockRefundId = BigInt(1);
    const mockApprovedBy = BigInt(2);
    const mockApproveDto = { notes: 'Approved for damage' };

    it('should approve refund successfully', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PENDING,
        notes: 'Original notes',
      };

      const mockUpdatedRefund = {
        ...mockRefund,
        status: RefundStatus.APPROVED,
        approvedBy: mockApprovedBy,
        approvedAt: new Date(),
        notes: mockApproveDto.notes,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue(mockUpdatedRefund as any);

      const result = await service.approveRefund(mockRefundId, mockApproveDto, mockApprovedBy);

      expect(result.status).toBe(RefundStatus.APPROVED);
      expect(result.approvedBy).toBe(mockApprovedBy);
      expect(result.notes).toBe(mockApproveDto.notes);
    });

    it('should throw NotFoundException if refund not found', async () => {
      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(null);

      await expect(service.approveRefund(mockRefundId, mockApproveDto, mockApprovedBy))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund is not pending', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.APPROVED,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);

      await expect(service.approveRefund(mockRefundId, mockApproveDto, mockApprovedBy))
        .rejects.toThrow(BadRequestException);
    });

    it('should use existing notes if no notes provided in approval', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PENDING,
        notes: 'Existing notes',
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue({ ...mockRefund, status: RefundStatus.APPROVED } as any);

      await service.approveRefund(mockRefundId, {}, mockApprovedBy);

      expect(prisma.refund.update).toHaveBeenCalledWith({
        where: { id: mockRefundId },
        data: expect.objectContaining({ notes: 'Existing notes' }),
      });
    });
  });

  describe('rejectRefund', () => {
    const mockRefundId = BigInt(1);
    const mockRejectedBy = BigInt(2);
    const mockRejectDto = { reason: 'Invalid claim', notes: 'Rejected due to policy' };

    it('should reject refund successfully', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PENDING,
        notes: 'Original notes',
      };

      const mockUpdatedRefund = {
        ...mockRefund,
        status: RefundStatus.REJECTED,
        notes: mockRejectDto.notes,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue(mockUpdatedRefund as any);

      const result = await service.rejectRefund(mockRefundId, mockRejectDto, mockRejectedBy);

      expect(result.status).toBe(RefundStatus.REJECTED);
      expect(result.notes).toBe(mockRejectDto.notes);
    });

    it('should use existing notes if no notes provided in rejection', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PENDING,
        notes: 'Existing notes',
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue({ ...mockRefund, status: RefundStatus.REJECTED } as any);

      await service.rejectRefund(mockRefundId, { reason: 'Invalid' }, mockRejectedBy);

      expect(prisma.refund.update).toHaveBeenCalledWith({
        where: { id: mockRefundId },
        data: expect.objectContaining({ notes: 'Existing notes' }),
      });
    });
  });

  describe('processRefund', () => {
    const mockRefundId = BigInt(1);
    const mockProcessedBy = BigInt(2);
    const mockProcessDto = {
      refundMethod: 'bank_transfer' as const,
      transactionId: 'txn-123',
      notes: 'Processing via bank transfer',
    };

    it('should process refund successfully', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.APPROVED,
        amount: 500,
        reason: 'Damage',
        order: {
          id: BigInt(100),
          vendorId: BigInt(3),
          customerId: BigInt(4),
        },
      };

      const mockUpdatedRefund = {
        ...mockRefund,
        status: RefundStatus.PROCESSING,
        processedBy: mockProcessedBy,
        processedAt: new Date(),
        refundMethod: mockProcessDto.refundMethod,
        transactionId: mockProcessDto.transactionId,
        notes: mockProcessDto.notes,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue(mockUpdatedRefund as any);
      jest.spyOn(ledgerService, 'createLedgerEntry').mockResolvedValue();

      const result = await service.processRefund(mockRefundId, mockProcessDto, mockProcessedBy);

      expect(result.status).toBe(RefundStatus.PROCESSING);
      expect(result.refundMethod).toBe('bank_transfer');
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith({
        vendorId: '3',
        orderId: '100',
        userId: '4',
        amount: -500, // Negative for refund
        type: LedgerEntryType.REFUND,
        description: 'Refund processed: Damage',
        metadata: {
          refundId: '1',
          reason: 'Damage',
        },
      });
    });

    it('should throw BadRequestException if refund is not approved', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PENDING,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);

      await expect(service.processRefund(mockRefundId, mockProcessDto, mockProcessedBy))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid refund method', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.APPROVED,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);

      await expect(service.processRefund(mockRefundId, { ...mockProcessDto, refundMethod: 'invalid' as any }, mockProcessedBy))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('completeRefund', () => {
    const mockRefundId = BigInt(1);
    const mockTransactionId = 'txn-456';

    it('should complete refund successfully', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PROCESSING,
        amount: 500,
        order: {
          id: BigInt(100),
          customerId: BigInt(4),
          paymentMethod: 'wallet',
          paymentStatus: 'paid',
        },
      };

      const mockUpdatedRefund = {
        ...mockRefund,
        status: RefundStatus.COMPLETED,
        transactionId: mockTransactionId,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue(mockUpdatedRefund as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({} as any);
      jest.spyOn(userService, 'updateWalletBalance').mockResolvedValue();

      const result = await service.completeRefund(mockRefundId, mockTransactionId);

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(result.transactionId).toBe(mockTransactionId);
      expect(userService.updateWalletBalance).toHaveBeenCalledWith('4', 500);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: {
          id_createdAt: {
            id: BigInt(100),
            createdAt: mockRefund.order.createdAt,
          },
        },
        data: { paymentStatus: 'refunded' },
      });
    });

    it('should throw BadRequestException if refund is not processing', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.APPROVED,
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);

      await expect(service.completeRefund(mockRefundId))
        .rejects.toThrow(BadRequestException);
    });

    it('should not update wallet for non-wallet payments', async () => {
      const mockRefund = {
        id: mockRefundId,
        status: RefundStatus.PROCESSING,
        amount: 500,
        order: {
          id: BigInt(100),
          customerId: BigInt(4),
          paymentMethod: 'card',
        },
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);
      jest.spyOn(prisma.refund, 'update').mockResolvedValue({ ...mockRefund, status: RefundStatus.COMPLETED } as any);
      jest.spyOn(prisma.order, 'update').mockResolvedValue({} as any);

      await service.completeRefund(mockRefundId);

      expect(userService.updateWalletBalance).not.toHaveBeenCalled();
    });
  });

  describe('getRefunds', () => {
    const mockQuery = {
      status: RefundStatus.PENDING,
      orderId: 'order-123',
      page: 1,
      limit: 10,
    };

    it('should return paginated refunds with filters', async () => {
      const mockOrder = {
        id: BigInt(100),
        orderUuid: 'order-123',
        createdAt: new Date(),
      };

      const mockRefunds = [
        {
          id: BigInt(1),
          amount: 500,
          status: RefundStatus.PENDING,
          order: {
            customer: { name: 'John Doe' },
            vendor: { name: 'Vendor Inc' },
          },
        },
      ];

      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
      jest.spyOn(prisma.refund, 'findMany').mockResolvedValue(mockRefunds as any);
      jest.spyOn(prisma.refund, 'count').mockResolvedValue(1);

      const result = await service.getRefunds(mockQuery);

      expect(result.refunds).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.refunds[0].amount).toBe(500);
    });

    it('should handle empty results', async () => {
      jest.spyOn(prisma.refund, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.refund, 'count').mockResolvedValue(0);

      const result = await service.getRefunds({});

      expect(result.refunds).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply default pagination', async () => {
      jest.spyOn(prisma.refund, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.refund, 'count').mockResolvedValue(0);

      await service.getRefunds({});

      expect(prisma.refund.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getRefundById', () => {
    it('should return refund by id', async () => {
      const mockRefund = {
        id: BigInt(1),
        amount: 500,
        status: RefundStatus.PENDING,
        order: {
          customer: { name: 'John Doe' },
          vendor: { name: 'Vendor Inc' },
        },
      };

      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(mockRefund as any);

      const result = await service.getRefundById(BigInt(1));

      expect(result.id).toBe(1);
      expect(result.amount).toBe(500);
    });

    it('should throw NotFoundException if refund not found', async () => {
      jest.spyOn(prisma.refund, 'findUnique').mockResolvedValue(null);

      await expect(service.getRefundById(BigInt(999)))
        .rejects.toThrow(NotFoundException);
    });
  });
});