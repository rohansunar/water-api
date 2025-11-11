import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RefundService } from '../../../src/refund/services/refund.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { LedgerService } from '../../../src/ledger/services/ledger.service';
import { RefundStatus } from '../../../src/refund/interfaces/refund.interface';
import { ConflictException as CustomConflictException } from '../../../src/common/exceptions/business.exception';

// Mock services
jest.mock('../../../src/common/database/prisma.service');
jest.mock('../../../src/ledger/services/ledger.service');

describe('RefundService - Conflict Scenarios', () => {
  let service: RefundService;
  let prismaService: jest.Mocked<PrismaService>;
  let ledgerService: jest.Mocked<LedgerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        PrismaService,
        LedgerService,
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prismaService = module.get(PrismaService);
    ledgerService = module.get(LedgerService);
  });

  describe('createRefund - Conflict Scenarios', () => {
    it('should throw ConflictException when refund already exists for order', async () => {
      const orderId = 'order123';
      const createRefundDto = {
        amount: 100,
        reason: 'Product damaged',
        notes: 'Customer reported damaged product',
      };
      const createdBy = BigInt(456);

      // Mock order exists
      const mockOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        totalAmount: 200,
        createdAt: new Date(),
      };
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);

      // Mock existing refund
      const existingRefund = {
        id: BigInt(999),
        orderId: BigInt(789),
        orderCreatedAt: mockOrder.createdAt,
        status: RefundStatus.PENDING,
      };
      prismaService.refund.findFirst.mockResolvedValue(existingRefund as any);

      await expect(service.createRefund(orderId, createRefundDto, createdBy))
        .rejects.toThrow(CustomConflictException);

      expect(prismaService.refund.create).not.toHaveBeenCalled();
    });

    it('should allow creating refund when no existing refund for order', async () => {
      const orderId = 'order123';
      const createRefundDto = {
        amount: 100,
        reason: 'Product damaged',
        notes: 'Customer reported damaged product',
      };
      const createdBy = BigInt(456);

      // Mock order exists
      const mockOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        totalAmount: 200,
        createdAt: new Date(),
      };
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);

      // Mock no existing refund
      prismaService.refund.findFirst.mockResolvedValue(null);

      // Mock refund creation
      const createdRefund = {
        id: BigInt(999),
        orderId: BigInt(789),
        orderCreatedAt: mockOrder.createdAt,
        amount: 100,
        reason: 'Product damaged',
        notes: 'Customer reported damaged product',
        status: RefundStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.refund.create.mockResolvedValue(createdRefund as any);

      const result = await service.createRefund(orderId, createRefundDto, createdBy);

      expect(result.id).toBe(BigInt(999));
      expect(result.amount).toBe(100);
      expect(result.status).toBe(RefundStatus.PENDING);
      expect(prismaService.refund.create).toHaveBeenCalledWith({
        data: {
          orderId: BigInt(789),
          orderCreatedAt: mockOrder.createdAt,
          amount: 100,
          reason: 'Product damaged',
          notes: 'Customer reported damaged product',
          status: RefundStatus.PENDING,
        },
      });
    });

    it('should throw BadRequestException when refund amount exceeds order total', async () => {
      const orderId = 'order123';
      const createRefundDto = {
        amount: 300, // Exceeds order total of 200
        reason: 'Product damaged',
        notes: 'Customer reported damaged product',
      };
      const createdBy = BigInt(456);

      // Mock order exists with lower total
      const mockOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        totalAmount: 200,
        createdAt: new Date(),
      };
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);

      // Mock no existing refund
      prismaService.refund.findFirst.mockResolvedValue(null);

      await expect(service.createRefund(orderId, createRefundDto, createdBy))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund - Conflict Scenarios', () => {
    it('should throw BadRequestException when approving non-pending refund', async () => {
      const refundId = BigInt(123);
      const approveDto = {
        notes: 'Approved for processing',
      };
      const approvedBy = BigInt(456);

      // Mock refund exists but is not pending
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED, // Already approved
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      await expect(service.approveRefund(refundId, approveDto, approvedBy))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.update).not.toHaveBeenCalled();
    });

    it('should allow approving pending refund', async () => {
      const refundId = BigInt(123);
      const approveDto = {
        notes: 'Approved for processing',
      };
      const approvedBy = BigInt(456);

      // Mock refund exists and is pending
      const mockRefund = {
        id: refundId,
        status: RefundStatus.PENDING,
        notes: 'Original notes',
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      // Mock update
      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
        notes: 'Approved for processing',
      };
      prismaService.refund.update.mockResolvedValue(updatedRefund as any);

      const result = await service.approveRefund(refundId, approveDto, approvedBy);

      expect(result.status).toBe(RefundStatus.APPROVED);
      expect(result.approvedBy).toBe(approvedBy);
      expect(prismaService.refund.update).toHaveBeenCalled();
    });
  });

  describe('rejectRefund - Conflict Scenarios', () => {
    it('should throw BadRequestException when rejecting non-pending refund', async () => {
      const refundId = BigInt(123);
      const rejectDto = {
        reason: 'Invalid request',
        notes: 'Refund request does not meet criteria',
      };
      const rejectedBy = BigInt(456);

      // Mock refund exists but is not pending
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED, // Already approved
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      await expect(service.rejectRefund(refundId, rejectDto, rejectedBy))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.update).not.toHaveBeenCalled();
    });

    it('should allow rejecting pending refund', async () => {
      const refundId = BigInt(123);
      const rejectDto = {
        reason: 'Invalid request',
        notes: 'Refund request does not meet criteria',
      };
      const rejectedBy = BigInt(456);

      // Mock refund exists and is pending
      const mockRefund = {
        id: refundId,
        status: RefundStatus.PENDING,
        notes: 'Original notes',
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      // Mock update
      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.REJECTED,
        notes: 'Refund request does not meet criteria',
      };
      prismaService.refund.update.mockResolvedValue(updatedRefund as any);

      const result = await service.rejectRefund(refundId, rejectDto, rejectedBy);

      expect(result.status).toBe(RefundStatus.REJECTED);
      expect(result.notes).toBe('Refund request does not meet criteria');
    });
  });

  describe('processRefund - Conflict Scenarios', () => {
    it('should throw BadRequestException when processing non-approved refund', async () => {
      const refundId = BigInt(123);
      const processDto = {
        refundMethod: 'wallet',
        transactionId: 'txn123',
        notes: 'Processing refund',
      };
      const processedBy = BigInt(456);

      // Mock refund exists but is not approved
      const mockRefund = {
        id: refundId,
        status: RefundStatus.PENDING, // Not approved
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      await expect(service.processRefund(refundId, processDto, processedBy))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid refund method', async () => {
      const refundId = BigInt(123);
      const processDto = {
        refundMethod: 'invalid_method',
        transactionId: 'txn123',
        notes: 'Processing refund',
      };
      const processedBy = BigInt(456);

      // Mock refund exists and is approved
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED,
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      await expect(service.processRefund(refundId, processDto, processedBy))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.update).not.toHaveBeenCalled();
    });

    it('should allow processing approved refund with valid method', async () => {
      const refundId = BigInt(123);
      const processDto = {
        refundMethod: 'wallet',
        transactionId: 'txn123',
        notes: 'Processing refund',
      };
      const processedBy = BigInt(456);

      // Mock refund exists and is approved
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED,
        amount: 100,
        reason: 'Product damaged',
        notes: 'Original notes',
        order: {
          id: BigInt(789),
          vendorId: BigInt(111),
          customerId: BigInt(222),
        },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      // Mock update
      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.PROCESSING,
        processedBy,
        processedAt: new Date(),
        refundMethod: 'wallet',
        transactionId: 'txn123',
        notes: 'Processing refund',
      };
      prismaService.refund.update.mockResolvedValue(updatedRefund as any);

      // Mock ledger service
      ledgerService.createLedgerEntry.mockResolvedValue(undefined);

      const result = await service.processRefund(refundId, processDto, processedBy);

      expect(result.status).toBe(RefundStatus.PROCESSING);
      expect(result.refundMethod).toBe('wallet');
      expect(result.transactionId).toBe('txn123');
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith({
        vendorId: '111',
        orderId: '789',
        userId: '222',
        amount: -100,
        type: expect.any(String), // LedgerEntryType.REFUND
        description: 'Refund processed: Product damaged',
        metadata: {
          refundId: '123',
          reason: 'Product damaged',
        },
      });
    });
  });

  describe('completeRefund - Conflict Scenarios', () => {
    it('should throw BadRequestException when completing non-processing refund', async () => {
      const refundId = BigInt(123);
      const transactionId = 'txn123';

      // Mock refund exists but is not processing
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED, // Not processing
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      await expect(service.completeRefund(refundId, transactionId))
        .rejects.toThrow(BadRequestException);

      expect(prismaService.refund.update).not.toHaveBeenCalled();
    });

    it('should allow completing processing refund', async () => {
      const refundId = BigInt(123);
      const transactionId = 'txn123';

      // Mock refund exists and is processing
      const mockRefund = {
        id: refundId,
        status: RefundStatus.PROCESSING,
        amount: 100,
        order: {
          id: BigInt(789),
          createdAt: new Date(),
          paymentMethod: 'wallet',
          customerId: BigInt(222),
        },
        transactionId: 'old_txn',
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      // Mock updates
      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.COMPLETED,
        transactionId: 'txn123',
      };
      prismaService.refund.update.mockResolvedValue(updatedRefund as any);
      prismaService.order.update.mockResolvedValue(undefined);

      const result = await service.completeRefund(refundId, transactionId);

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(result.transactionId).toBe('txn123');
      expect(prismaService.order.update).toHaveBeenCalled();
    });
  });

  describe('Error Response Structure Verification', () => {
    it('should throw NotFoundException for non-existent order in createRefund', async () => {
      const orderId = 'non-existent-order';
      const createRefundDto = {
        amount: 100,
        reason: 'Product damaged',
      };
      const createdBy = BigInt(456);

      // Mock order not found
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.createRefund(orderId, createRefundDto, createdBy))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent refund', async () => {
      const refundId = BigInt(999);

      // Mock refund not found
      prismaService.refund.findUnique.mockResolvedValue(null);

      await expect(service.approveRefund(refundId, {}, BigInt(456)))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException with proper context for duplicate refunds', async () => {
      const orderId = 'order123';
      const createRefundDto = {
        amount: 100,
        reason: 'Product damaged',
      };
      const createdBy = BigInt(456);

      // Mock order exists
      const mockOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        totalAmount: 200,
        createdAt: new Date(),
      };
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);

      // Mock existing refund
      const existingRefund = {
        id: BigInt(999),
        orderId: BigInt(789),
        orderCreatedAt: mockOrder.createdAt,
        status: RefundStatus.PENDING,
      };
      prismaService.refund.findFirst.mockResolvedValue(existingRefund as any);

      try {
        await service.createRefund(orderId, createRefundDto, createdBy);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomConflictException);
        expect(error.message).toContain('Refund already exists');
        expect(error.message).toContain(orderId);
        expect(error.context).toEqual({
          orderId,
          metadata: {
            existingRefundId: '999',
            orderCreatedAt: mockOrder.createdAt.toISOString(),
          },
        });
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing error messages for NotFoundException', async () => {
      const refundId = BigInt(999);

      // Mock refund not found
      prismaService.refund.findUnique.mockResolvedValue(null);

      try {
        await service.getRefundById(refundId);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Refund not found');
      }
    });

    it('should maintain existing error messages for BadRequestException', async () => {
      const refundId = BigInt(123);
      const processDto = {
        refundMethod: 'invalid_method',
      };
      const processedBy = BigInt(456);

      // Mock approved refund
      const mockRefund = {
        id: refundId,
        status: RefundStatus.APPROVED,
        order: { id: BigInt(789) },
      };
      prismaService.refund.findUnique.mockResolvedValue(mockRefund as any);

      try {
        await service.processRefund(refundId, processDto, processedBy);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Invalid refund method');
      }
    });

    it('should handle undefined optional fields gracefully', async () => {
      const orderId = 'order123';
      const createRefundDto = {
        amount: 100,
        reason: 'Product damaged',
        notes: undefined, // No notes provided
      };
      const createdBy = BigInt(456);

      // Mock order exists
      const mockOrder = {
        id: BigInt(789),
        orderUuid: orderId,
        totalAmount: 200,
        createdAt: new Date(),
      };
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);

      // Mock no existing refund
      prismaService.refund.findFirst.mockResolvedValue(null);

      // Mock refund creation
      const createdRefund = {
        id: BigInt(999),
        orderId: BigInt(789),
        orderCreatedAt: mockOrder.createdAt,
        amount: 100,
        reason: 'Product damaged',
        notes: null, // Notes can be null
        status: RefundStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.refund.create.mockResolvedValue(createdRefund as any);

      const result = await service.createRefund(orderId, createRefundDto, createdBy);

      expect(result.notes).toBeNull();
      expect(result.amount).toBe(100);
    });
  });
});