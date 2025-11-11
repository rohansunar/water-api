import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConflictException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../common/database/prisma.service';
import { RefundStatus } from '../interfaces/refund.interface';
import {
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
  RefundResponseDto,
  RefundListQueryDto,
} from '../dto/refund.dto';
import { LedgerService } from '../../ledger/services/ledger.service';
import { LedgerEntryType } from '../../ledger/interfaces/ledger.interface';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly prismaService: PrismaService,
  ) {}

  async createRefund(
    orderId: string,
    createRefundDto: CreateRefundDto,
    createdBy: bigint,
  ): Promise<RefundResponseDto> {
    try {
      // Find the order
      const order = await this.prismaService.order.findUnique({
        where: { orderUuid: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check if refund already exists for this order
      const existingRefund = await this.prismaService.refund.findFirst({
        where: {
          orderId: order.id,
          orderCreatedAt: order.createdAt,
          status: {
            notIn: ['REJECTED', 'CANCELLED'],
          },
        },
      });

      if (existingRefund) {
        throw new ConflictException(
          `Refund already exists for order ${orderId}. Existing refund ID: ${existingRefund.id}`,
          {
            orderId,
            metadata: {
              existingRefundId: existingRefund.id.toString(),
              orderCreatedAt: order.createdAt.toISOString(),
            },
          },
        );
      }

      // Validate refund amount
      if (createRefundDto.amount > Number(order.totalAmount)) {
        throw new BadRequestException(
          'Refund amount cannot exceed order total',
        );
      }

      // Create refund
      const refund = await this.prismaService.refund.create({
        data: {
          orderId: order.id,
          orderCreatedAt: order.createdAt,
          amount: createRefundDto.amount,
          reason: createRefundDto.reason,
          notes: createRefundDto.notes,
          status: RefundStatus.PENDING,
        },
      });

      this.logger.log(`Created refund ${refund.id} for order ${orderId}`);

      return this.mapToResponseDto(refund);
    } catch (error) {
      this.logger.error(`Failed to create refund for order ${orderId}:`, error);
      throw error;
    }
  }

  async approveRefund(
    refundId: bigint,
    approveDto: ApproveRefundDto,
    approvedBy: bigint,
  ): Promise<RefundResponseDto> {
    try {
      const refund = await this.prismaService.refund.findUnique({
        where: { id: refundId },
        include: { order: true },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException('Refund is not in pending status');
      }

      // Update refund status
      const updatedRefund = await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.APPROVED,
          approvedBy,
          approvedAt: new Date(),
          notes: approveDto.notes || refund.notes,
        },
      });

      this.logger.log(`Approved refund ${refundId} by admin ${approvedBy}`);

      return this.mapToResponseDto(updatedRefund);
    } catch (error) {
      this.logger.error(`Failed to approve refund ${refundId}:`, error);
      throw error;
    }
  }

  async rejectRefund(
    refundId: bigint,
    rejectDto: RejectRefundDto,
    rejectedBy: bigint,
  ): Promise<RefundResponseDto> {
    try {
      const refund = await this.prismaService.refund.findUnique({
        where: { id: refundId },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException('Refund is not in pending status');
      }

      // Update refund status
      const updatedRefund = await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.REJECTED,
          notes: rejectDto.notes || refund.notes,
        },
      });

      this.logger.log(
        `Rejected refund ${refundId} by admin ${rejectedBy}: ${rejectDto.reason}`,
      );

      return this.mapToResponseDto(updatedRefund);
    } catch (error) {
      this.logger.error(`Failed to reject refund ${refundId}:`, error);
      throw error;
    }
  }

  async processRefund(
    refundId: bigint,
    processDto: ProcessRefundDto,
    processedBy: bigint,
  ): Promise<RefundResponseDto> {
    try {
      const refund = await this.prismaService.refund.findUnique({
        where: { id: refundId },
        include: { order: true },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.APPROVED) {
        throw new BadRequestException(
          'Refund must be approved before processing',
        );
      }

      // Process the refund based on payment method
      await this.executeRefund(refund, processDto);

      // Update refund status
      const updatedRefund = await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.PROCESSING,
          processedBy,
          processedAt: new Date(),
          refundMethod: processDto.refundMethod,
          transactionId: processDto.transactionId,
          notes: processDto.notes || refund.notes,
        },
      });

      // Create ledger entry for refund
      await this.ledgerService.createLedgerEntry({
        vendorId: refund.order.vendorId.toString(),
        orderId: refund.order.id.toString(),
        userId: refund.order.customerId.toString(),
        amount: -Number(refund.amount),
        type: LedgerEntryType.REFUND,
        description: `Refund processed: ${refund.reason}`,
        metadata: {
          refundId: refund.id.toString(),
          reason: refund.reason,
        },
      });

      this.logger.log(
        `Processing refund ${refundId} via ${processDto.refundMethod}`,
      );

      return this.mapToResponseDto(updatedRefund);
    } catch (error) {
      this.logger.error(`Failed to process refund ${refundId}:`, error);
      throw error;
    }
  }

  async completeRefund(
    refundId: bigint,
    transactionId?: string,
  ): Promise<RefundResponseDto> {
    try {
      const refund = await this.prismaService.refund.findUnique({
        where: { id: refundId },
        include: { order: true },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PROCESSING) {
        throw new BadRequestException('Refund is not in processing status');
      }

      // Update refund status to completed
      const updatedRefund = await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.COMPLETED,
          transactionId: transactionId || refund.transactionId,
        },
      });

      // Update order payment status if this was the final refund
      await this.prismaService.order.update({
        where: {
          id_createdAt: {
            id: refund.order.id,
            createdAt: refund.order.createdAt,
          },
        },
        data: {
          paymentStatus: 'refunded',
        },
      });

      // TODO: Refund to user's wallet if applicable without UserService
      if (refund.order.paymentMethod === 'wallet') {
        this.logger.log(
          `Wallet refund needed for user ${refund.order.customerId}: +${refund.amount}`,
        );
      }

      this.logger.log(`Completed refund ${refundId}`);

      return this.mapToResponseDto(updatedRefund);
    } catch (error) {
      this.logger.error(`Failed to complete refund ${refundId}:`, error);
      throw error;
    }
  }

  async getRefunds(query: RefundListQueryDto): Promise<{
    refunds: RefundResponseDto[];
    total: number;
  }> {
    try {
      const where: any = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.orderId) {
        const order = await this.prismaService.order.findUnique({
          where: { orderUuid: query.orderId },
        });
        if (order) {
          where.orderId = order.id;
          where.orderCreatedAt = order.createdAt;
        }
      }

      const [refunds, total] = await Promise.all([
        this.prismaService.refund.findMany({
          where,
          include: {
            order: {
              include: {
                customer: { select: { name: true } },
                vendor: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: ((query.page || 1) - 1) * (query.limit || 10),
          take: query.limit || 10,
        }),
        this.prismaService.refund.count({ where }),
      ]);

      return {
        refunds: refunds.map((refund) => this.mapToResponseDto(refund)),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to get refunds:', error);
      throw error;
    }
  }

  async getRefundById(refundId: bigint): Promise<RefundResponseDto> {
    const refund = await this.prismaService.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            customer: { select: { name: true } },
            vendor: { select: { name: true } },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return this.mapToResponseDto(refund);
  }

  private async executeRefund(
    refund: any,
    processDto: ProcessRefundDto,
  ): Promise<void> {
    // In a real implementation, this would integrate with payment gateways
    // For now, we'll simulate the refund process
    switch (processDto.refundMethod) {
      case 'wallet':
        // Wallet refunds are handled when completing the refund
        break;
      case 'bank_transfer':
        // Simulate bank transfer
        break;
      case 'upi':
        // Simulate UPI refund
        break;
      default:
        throw new BadRequestException('Invalid refund method');
    }
  }

  private mapToResponseDto(refund: any): RefundResponseDto {
    return {
      id: refund.id,
      orderId: refund.orderId,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      refundMethod: refund.refundMethod,
      transactionId: refund.transactionId,
      processedBy: refund.processedBy,
      processedAt: refund.processedAt,
      approvedBy: refund.approvedBy,
      approvedAt: refund.approvedAt,
      notes: refund.notes,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}
