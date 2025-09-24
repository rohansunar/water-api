import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface AuditLogData {
  adminId: bigint;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private prisma = new PrismaClient();

  async logAction(logData: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: logData.adminId,
          action: logData.action,
          resourceType: logData.resourceType,
          resourceId: logData.resourceId,
          oldValues: logData.oldValues,
          newValues: logData.newValues,
          metadata: logData.metadata,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
        },
      });

      this.logger.log(
        `Audit log created: ${logData.action} on ${logData.resourceType}:${logData.resourceId} by admin ${logData.adminId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  async getAuditLogs(
    filters: {
      adminId?: bigint;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<any[]> {
    try {
      const where: any = {};

      if (filters.adminId) where.adminId = filters.adminId;
      if (filters.action) where.action = filters.action;
      if (filters.resourceType) where.resourceType = filters.resourceType;
      if (filters.resourceId) where.resourceId = filters.resourceId;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: { id: true, name: true, email: true, roleLevel: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      });

      return logs;
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  async getAuditLogById(id: bigint): Promise<any> {
    try {
      const log = await this.prisma.auditLog.findUnique({
        where: { id },
        include: {
          admin: {
            select: { id: true, name: true, email: true, roleLevel: true },
          },
        },
      });

      if (!log) {
        throw new Error('Audit log not found');
      }

      return log;
    } catch (error) {
      this.logger.error(`Failed to retrieve audit log ${id}:`, error);
      throw error;
    }
  }
}