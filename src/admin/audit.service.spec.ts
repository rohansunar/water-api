import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaClient } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = (service as any).prisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    const mockLogData = {
      adminId: BigInt(1),
      action: 'user_status_updated',
      resourceType: 'user',
      resourceId: 'user-123',
      oldValues: { isActive: true },
      newValues: { isActive: false },
      metadata: { reason: 'Admin action' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should log action successfully', async () => {
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({
        id: BigInt(1),
        ...mockLogData,
        createdAt: new Date(),
      } as any);

      await service.logAction(mockLogData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          adminId: mockLogData.adminId,
          action: mockLogData.action,
          resourceType: mockLogData.resourceType,
          resourceId: mockLogData.resourceId,
          oldValues: mockLogData.oldValues,
          newValues: mockLogData.newValues,
          metadata: mockLogData.metadata,
          ipAddress: mockLogData.ipAddress,
          userAgent: mockLogData.userAgent,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(service.logAction(mockLogData)).resolves.not.toThrow();
    });

    it('should handle optional fields', async () => {
      const minimalLogData = {
        adminId: BigInt(1),
        action: 'login',
        resourceType: 'admin',
        resourceId: 'admin-1',
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({
        id: BigInt(1),
        ...minimalLogData,
        createdAt: new Date(),
      } as any);

      await service.logAction(minimalLogData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValues: undefined,
          newValues: undefined,
          metadata: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        }),
      });
    });
  });

  describe('getAuditLogs', () => {
    const mockFilters = {
      adminId: BigInt(1),
      action: 'user_status_updated',
      resourceType: 'user',
      resourceId: 'user-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      limit: 10,
      offset: 0,
    };

    it('should return audit logs with filters', async () => {
      const mockLogs = [
        {
          id: BigInt(1),
          adminId: BigInt(1),
          action: 'user_status_updated',
          resourceType: 'user',
          resourceId: 'user-123',
          createdAt: new Date(),
          admin: {
            id: BigInt(1),
            name: 'Admin User',
            email: 'admin@example.com',
            roleLevel: 'super_admin',
          },
        },
      ];

      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue(mockLogs as any);

      const result = await service.getAuditLogs(mockFilters);

      expect(result).toHaveLength(1);
      expect(result[0].admin.name).toBe('Admin User');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          adminId: mockFilters.adminId,
          action: mockFilters.action,
          resourceType: mockFilters.resourceType,
          resourceId: mockFilters.resourceId,
          createdAt: {
            gte: mockFilters.startDate,
            lte: mockFilters.endDate,
          },
        },
        include: {
          admin: {
            select: { id: true, name: true, email: true, roleLevel: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: mockFilters.limit,
        skip: mockFilters.offset,
      });
    });

    it('should apply default values for limit and offset', async () => {
      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);

      await service.getAuditLogs({});

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50, // default limit
        skip: 0,  // default offset
      });
    });

    it('should handle partial date filters', async () => {
      const partialFilters = {
        startDate: new Date('2024-01-01'),
      };

      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);

      await service.getAuditLogs(partialFilters);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: partialFilters.startDate,
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.auditLog, 'findMany').mockRejectedValue(new Error('Database error'));

      await expect(service.getAuditLogs(mockFilters)).rejects.toThrow('Database error');
    });
  });

  describe('getAuditLogById', () => {
    const mockId = BigInt(1);

    it('should return audit log by id', async () => {
      const mockLog = {
        id: mockId,
        adminId: BigInt(1),
        action: 'user_status_updated',
        resourceType: 'user',
        resourceId: 'user-123',
        createdAt: new Date(),
        admin: {
          id: BigInt(1),
          name: 'Admin User',
          email: 'admin@example.com',
          roleLevel: 'super_admin',
        },
      };

      jest.spyOn(prisma.auditLog, 'findUnique').mockResolvedValue(mockLog as any);

      const result = await service.getAuditLogById(mockId);

      expect(result.id).toBe(mockId);
      expect(result.admin.name).toBe('Admin User');
    });

    it('should throw error if audit log not found', async () => {
      jest.spyOn(prisma.auditLog, 'findUnique').mockResolvedValue(null);

      await expect(service.getAuditLogById(mockId)).rejects.toThrow('Audit log not found');
    });

    it('should handle database errors', async () => {
      jest.spyOn(prisma.auditLog, 'findUnique').mockRejectedValue(new Error('Database error'));

      await expect(service.getAuditLogById(mockId)).rejects.toThrow('Database error');
    });
  });
});