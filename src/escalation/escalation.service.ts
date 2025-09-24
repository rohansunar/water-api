import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EscalationStatus } from '../common/interfaces/escalation.interface';
import {
  CreateEscalationDto,
  ResolveEscalationDto,
  UpdateEscalationStatusDto,
  EscalationResponseDto,
  EscalationListQueryDto,
} from '../common/dto/escalation.dto';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);
  private prisma = new PrismaClient();

  constructor() {}

  async createEscalation(
    createEscalationDto: CreateEscalationDto,
    escalatedBy: bigint,
  ): Promise<EscalationResponseDto> {
    try {
      // Find the dispute
      const dispute = await this.prisma.dispute.findUnique({
        where: { id: BigInt(createEscalationDto.disputeId) },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      // Check if escalation already exists for this dispute
      const existingEscalation = await this.prisma.escalation.findFirst({
        where: {
          disputeId: BigInt(createEscalationDto.disputeId),
          status: {
            notIn: [EscalationStatus.RESOLVED, EscalationStatus.CLOSED],
          },
        },
      });

      if (existingEscalation) {
        throw new BadRequestException('Escalation already exists for this dispute');
      }

      // Create escalation
      const escalation = await this.prisma.escalation.create({
        data: {
          disputeId: BigInt(createEscalationDto.disputeId),
          escalatedBy,
          escalatedTo: createEscalationDto.escalatedTo,
          reason: createEscalationDto.reason,
          priority: createEscalationDto.priority,
          status: EscalationStatus.PENDING,
        },
      });

      // Update dispute status to escalated
      await this.prisma.dispute.update({
        where: { id: BigInt(createEscalationDto.disputeId) },
        data: { status: 'ESCALATED' },
      });

      this.logger.log(`Created escalation ${escalation.id} for dispute ${createEscalationDto.disputeId}`);

      return this.mapToResponseDto(escalation);
    } catch (error) {
      this.logger.error(`Failed to create escalation for dispute ${createEscalationDto.disputeId}:`, error);
      throw error;
    }
  }

  async resolveEscalation(
    escalationId: bigint,
    resolveDto: ResolveEscalationDto,
    resolvedBy: bigint,
  ): Promise<EscalationResponseDto> {
    try {
      const escalation = await this.prisma.escalation.findUnique({
        where: { id: escalationId },
        include: { dispute: true },
      });

      if (!escalation) {
        throw new NotFoundException('Escalation not found');
      }

      if (escalation.status === EscalationStatus.RESOLVED || escalation.status === EscalationStatus.CLOSED) {
        throw new BadRequestException('Escalation is already resolved');
      }

      // Update escalation status
      const updatedEscalation = await this.prisma.escalation.update({
        where: { id: escalationId },
        data: {
          status: EscalationStatus.RESOLVED,
          resolution: resolveDto.resolution,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });

      // Update dispute status to resolved
      await this.prisma.dispute.update({
        where: { id: escalation.disputeId },
        data: {
          status: 'RESOLVED',
          resolution: resolveDto.resolution,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });

      this.logger.log(`Resolved escalation ${escalationId} by admin ${resolvedBy}`);

      return this.mapToResponseDto(updatedEscalation);
    } catch (error) {
      this.logger.error(`Failed to resolve escalation ${escalationId}:`, error);
      throw error;
    }
  }

  async updateEscalationStatus(
    escalationId: bigint,
    updateDto: UpdateEscalationStatusDto,
    updatedBy: bigint,
  ): Promise<EscalationResponseDto> {
    try {
      const escalation = await this.prisma.escalation.findUnique({
        where: { id: escalationId },
      });

      if (!escalation) {
        throw new NotFoundException('Escalation not found');
      }

      // Update escalation status
      const updatedEscalation = await this.prisma.escalation.update({
        where: { id: escalationId },
        data: {
          status: updateDto.status,
        },
      });

      this.logger.log(`Updated escalation ${escalationId} status to ${updateDto.status} by admin ${updatedBy}`);

      return this.mapToResponseDto(updatedEscalation);
    } catch (error) {
      this.logger.error(`Failed to update escalation ${escalationId} status:`, error);
      throw error;
    }
  }

  async getEscalations(query: EscalationListQueryDto): Promise<{
    escalations: EscalationResponseDto[];
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

      if (query.escalatedTo) {
        where.escalatedTo = query.escalatedTo;
      }

      if (query.disputeId) {
        const dispute = await this.prisma.dispute.findUnique({
          where: { id: BigInt(query.disputeId) },
        });
        if (dispute) {
          where.disputeId = dispute.id;
        }
      }

      const [escalations, total] = await Promise.all([
        this.prisma.escalation.findMany({
          where,
          include: {
            dispute: {
              include: {
                order: {
                  include: {
                    customer: { select: { name: true } },
                    vendor: { select: { name: true } },
                  },
                },
              },
            },
            escalator: { select: { name: true } },
            resolver: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: ((query.page || 1) - 1) * (query.limit || 10),
          take: query.limit || 10,
        }),
        this.prisma.escalation.count({ where }),
      ]);

      return {
        escalations: escalations.map(escalation => this.mapToResponseDto(escalation)),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to get escalations:', error);
      throw error;
    }
  }

  async getEscalationById(escalationId: bigint): Promise<EscalationResponseDto> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        dispute: {
          include: {
            order: {
              include: {
                customer: { select: { name: true } },
                vendor: { select: { name: true } },
              },
            },
          },
        },
        escalator: { select: { name: true } },
        resolver: { select: { name: true } },
      },
    });

    if (!escalation) {
      throw new NotFoundException('Escalation not found');
    }

    return this.mapToResponseDto(escalation);
  }

  async getEscalationsByDispute(disputeId: bigint): Promise<EscalationResponseDto[]> {
    const escalations = await this.prisma.escalation.findMany({
      where: { disputeId },
      include: {
        escalator: { select: { name: true } },
        resolver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return escalations.map(escalation => this.mapToResponseDto(escalation));
  }

  private mapToResponseDto(escalation: any): EscalationResponseDto {
    return {
      id: escalation.id,
      disputeId: escalation.disputeId,
      escalatedBy: escalation.escalatedBy,
      escalatedTo: escalation.escalatedTo,
      reason: escalation.reason,
      priority: escalation.priority,
      status: escalation.status,
      resolvedBy: escalation.resolvedBy,
      resolvedAt: escalation.resolvedAt,
      resolution: escalation.resolution,
      createdAt: escalation.createdAt,
      updatedAt: escalation.updatedAt,
    };
  }
}