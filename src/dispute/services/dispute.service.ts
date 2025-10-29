import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  DisputeStatus,
  DisputePriority,
} from '../../common/interfaces/dispute.interface';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  UpdateDisputeStatusDto,
  DisputeResponseDto,
  DisputeListQueryDto,
} from '../../common/dto/dispute.dto';
import { RefundService } from '../../refund/services/refund.service';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private readonly refundService: RefundService,
    private readonly prismaService: PrismaService,
  ) {}

  async createDispute(
    orderId: string,
    raisedBy: bigint,
    raisedByType: 'customer' | 'vendor' | 'admin',
    createDisputeDto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    try {
      // Find the order
      const order = await this.prismaService.order.findUnique({
        where: { orderUuid: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Validate that the user can raise dispute for this order
      if (raisedByType === 'customer' && order.customerId !== raisedBy) {
        throw new BadRequestException(
          'You can only raise disputes for your own orders',
        );
      }

      if (raisedByType === 'vendor' && order.vendorId !== raisedBy) {
        throw new BadRequestException(
          'You can only raise disputes for your own orders',
        );
      }

      // Check if dispute already exists for this order
      const existingDispute = await this.prismaService.dispute.findFirst({
        where: {
          orderId: order.id,
          orderCreatedAt: order.createdAt,
          status: {
            notIn: [DisputeStatus.RESOLVED, DisputeStatus.CLOSED],
          },
        },
      });

      if (existingDispute) {
        throw new BadRequestException('Dispute already exists for this order');
      }

      // Create dispute
      const dispute = await this.prismaService.dispute.create({
        data: {
          orderId: order.id,
          orderCreatedAt: order.createdAt,
          raisedBy,
          raisedByType,
          reason: createDisputeDto.reason,
          description: createDisputeDto.description,
          category: createDisputeDto.category,
          priority: createDisputeDto.priority || DisputePriority.MEDIUM,
          evidence: (createDisputeDto.evidence || {}) as any,
          status: DisputeStatus.OPEN,
        },
      });

      this.logger.log(
        `Created dispute ${dispute.id} for order ${orderId} by ${raisedByType} ${raisedBy}`,
      );

      return this.mapToResponseDto(dispute);
    } catch (error) {
      this.logger.error(
        `Failed to create dispute for order ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  async resolveDispute(
    disputeId: bigint,
    resolveDto: ResolveDisputeDto,
    resolvedBy: bigint,
  ): Promise<DisputeResponseDto> {
    try {
      const dispute = await this.prismaService.dispute.findUnique({
        where: { id: disputeId },
        include: { order: true },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      if (
        dispute.status === DisputeStatus.RESOLVED ||
        dispute.status === DisputeStatus.CLOSED
      ) {
        throw new BadRequestException('Dispute is already resolved');
      }

      // Update dispute status
      const updatedDispute = await this.prismaService.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: resolveDto.resolution,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });

      // If resolution involves refund, create refund request
      if (resolveDto.resolution.toLowerCase().includes('refund')) {
        try {
          // Extract refund amount from resolution or use order total
          const refundAmount =
            this.extractRefundAmount(resolveDto.resolution) ||
            dispute.order.totalAmount.toNumber();

          await this.refundService.createRefund(
            dispute.order.orderUuid,
            {
              orderId: dispute.order.orderUuid,
              amount: refundAmount,
              reason: `Dispute resolution: ${dispute.reason}`,
              notes: resolveDto.notes,
            },
            resolvedBy,
          );

          this.logger.log(`Created refund for resolved dispute ${disputeId}`);
        } catch (refundError) {
          this.logger.error(
            `Failed to create refund for dispute ${disputeId}:`,
            refundError,
          );
          // Don't fail the dispute resolution if refund creation fails
        }
      }

      this.logger.log(`Resolved dispute ${disputeId} by admin ${resolvedBy}`);

      return this.mapToResponseDto(updatedDispute);
    } catch (error) {
      this.logger.error(`Failed to resolve dispute ${disputeId}:`, error);
      throw error;
    }
  }

  async updateDisputeStatus(
    disputeId: bigint,
    updateDto: UpdateDisputeStatusDto,
    updatedBy: bigint,
  ): Promise<DisputeResponseDto> {
    try {
      const dispute = await this.prismaService.dispute.findUnique({
        where: { id: disputeId },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      // Update dispute status
      const updatedDispute = await this.prismaService.dispute.update({
        where: { id: disputeId },
        data: {
          status: updateDto.status,
        },
      });

      this.logger.log(
        `Updated dispute ${disputeId} status to ${updateDto.status} by admin ${updatedBy}`,
      );

      return this.mapToResponseDto(updatedDispute);
    } catch (error) {
      this.logger.error(`Failed to update dispute ${disputeId} status:`, error);
      throw error;
    }
  }

  async escalateDispute(
    disputeId: bigint,
    escalatedBy: bigint,
    escalatedTo: string,
    reason: string,
  ): Promise<DisputeResponseDto> {
    try {
      const dispute = await this.prismaService.dispute.findUnique({
        where: { id: disputeId },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      // Update dispute status to escalated
      const updatedDispute = await this.prismaService.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.ESCALATED,
        },
      });

      // Create escalation record
      await this.prismaService.escalation.create({
        data: {
          disputeId,
          escalatedBy,
          escalatedTo,
          reason,
          priority: DisputePriority.HIGH,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `Escalated dispute ${disputeId} to ${escalatedTo} by admin ${escalatedBy}`,
      );

      return this.mapToResponseDto(updatedDispute);
    } catch (error) {
      this.logger.error(`Failed to escalate dispute ${disputeId}:`, error);
      throw error;
    }
  }

  async getDisputes(query: DisputeListQueryDto): Promise<{
    disputes: DisputeResponseDto[];
    total: number;
  }> {
    try {
      const where: any = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.priority) {
        where.priority = query.priority;
      }

      if (query.category) {
        where.category = query.category;
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

      const [disputes, total] = await Promise.all([
        this.prismaService.dispute.findMany({
          where,
          include: {
            order: {
              include: {
                customer: { select: { name: true } },
                vendor: { select: { name: true } },
              },
            },
            resolver: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: ((query.page || 1) - 1) * (query.limit || 10),
          take: query.limit || 10,
        }),
        this.prismaService.dispute.count({ where }),
      ]);

      return {
        disputes: disputes.map((dispute) => this.mapToResponseDto(dispute)),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to get disputes:', error);
      throw error;
    }
  }

  async getDisputeById(disputeId: bigint): Promise<DisputeResponseDto> {
    const dispute = await this.prismaService.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            customer: { select: { name: true } },
            vendor: { select: { name: true } },
          },
        },
        resolver: { select: { name: true } },
        escalations: true,
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return this.mapToResponseDto(dispute);
  }

  async getDisputesByOrder(orderId: string): Promise<DisputeResponseDto[]> {
    const order = await this.prismaService.order.findUnique({
      where: { orderUuid: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const disputes = await this.prismaService.dispute.findMany({
      where: {
        orderId: order.id,
        orderCreatedAt: order.createdAt,
      },
      include: {
        resolver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((dispute) => this.mapToResponseDto(dispute));
  }

  private extractRefundAmount(resolution: string): number | null {
    // Simple regex to extract amount from resolution text
    const amountMatch = resolution.match(/₹?\s*(\d+(?:\.\d{2})?)/);
    return amountMatch ? parseFloat(amountMatch[1]) : null;
  }

  private mapToResponseDto(dispute: any): DisputeResponseDto {
    return {
      id: dispute.id,
      orderId: dispute.orderId,
      raisedBy: dispute.raisedBy,
      raisedByType: dispute.raisedByType,
      reason: dispute.reason,
      description: dispute.description,
      status: dispute.status,
      priority: dispute.priority,
      category: dispute.category,
      evidence: dispute.evidence,
      resolution: dispute.resolution,
      resolvedBy: dispute.resolvedBy,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }
}
