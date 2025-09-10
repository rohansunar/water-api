import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { MonthlyLedgerService } from '../monthly-ledger/monthly-ledger.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { UserRole } from '../common/interfaces/user.interface';

describe('AdminService', () => {
  let service: AdminService;
  let mockUserService: any;
  let mockVendorService: any;
  let mockMonthlyLedgerService: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockUserService = {
      update: jest.fn(),
    };

    mockVendorService = {};

    mockMonthlyLedgerService = {
      getPendingDues: jest.fn(),
    };

    mockLogger = {
      logBusinessEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: VendorService,
          useValue: mockVendorService,
        },
        {
          provide: MonthlyLedgerService,
          useValue: mockMonthlyLedgerService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockPendingDues = [
        { pendingAmount: 100 },
        { pendingAmount: 200 },
      ];
      mockMonthlyLedgerService.getPendingDues.mockResolvedValue(mockPendingDues);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalVendors');
      expect(result).toHaveProperty('totalDeliveryAgents');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('pendingVendorApprovals');
      expect(result).toHaveProperty('totalPendingDues');
      expect(result).toHaveProperty('monthlyRevenue');
      expect(result.totalPendingDues).toBe(300); // Sum of pending dues
    });

    it('should handle errors when retrieving dashboard stats', async () => {
      mockMonthlyLedgerService.getPendingDues.mockRejectedValue(new Error('Database error'));

      await expect(service.getDashboardStats()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without filters', async () => {
      const result = await service.getAllUsers();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('phone');
      expect(result[0]).toHaveProperty('role');
    });

    it('should filter users by role', async () => {
      const result = await service.getAllUsers(UserRole.CUSTOMER);

      expect(result).toBeInstanceOf(Array);
      result.forEach(user => {
        expect(user.role).toBe(UserRole.CUSTOMER);
      });
    });

    it('should filter users by status', async () => {
      const result = await service.getAllUsers(undefined, 'active');

      expect(result).toBeInstanceOf(Array);
      result.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should filter users by both role and status', async () => {
      const result = await service.getAllUsers(UserRole.VENDOR, 'active');

      expect(result).toBeInstanceOf(Array);
      result.forEach(user => {
        expect(user.role).toBe(UserRole.VENDOR);
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const userId = 'user-id-1';
      const isActive = false;

      mockUserService.update.mockResolvedValue({ id: userId, isActive });

      const result = await service.updateUserStatus(userId, isActive);

      expect(mockUserService.update).toHaveBeenCalledWith(userId, { isActive });
      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('user_status_updated', {
        userId,
        isActive,
        updatedBy: 'admin',
      });
      expect(result.message).toContain('deactivated');
    });

    it('should handle activation message correctly', async () => {
      const userId = 'user-id-1';
      const isActive = true;

      mockUserService.update.mockResolvedValue({ id: userId, isActive });

      const result = await service.updateUserStatus(userId, isActive);

      expect(result.message).toContain('activated');
    });

    it('should handle update errors', async () => {
      const userId = 'user-id-1';
      const isActive = true;

      mockUserService.update.mockRejectedValue(new Error('User not found'));

      await expect(service.updateUserStatus(userId, isActive)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingVendorApprovals', () => {
    it('should return pending vendor approvals', async () => {
      const result = await service.getPendingVendorApprovals();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('businessName');
      expect(result[0]).toHaveProperty('status');
      expect(result[0].status).toBe('pending_approval');
    });
  });

  describe('approveVendor', () => {
    it('should approve vendor successfully', async () => {
      const vendorId = 'vendor-id-1';

      const result = await service.approveVendor(vendorId);

      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('vendor_approved', {
        vendorId,
        approvedBy: 'admin',
        approvedAt: expect.any(Date),
      });
      expect(result.message).toBe('Vendor approved successfully');
    });
  });

  describe('rejectVendor', () => {
    it('should reject vendor successfully', async () => {
      const vendorId = 'vendor-id-1';
      const reason = 'Incomplete documentation';

      const result = await service.rejectVendor(vendorId, reason);

      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('vendor_rejected', {
        vendorId,
        reason,
        rejectedBy: 'admin',
        rejectedAt: expect.any(Date),
      });
      expect(result.message).toBe('Vendor rejected successfully');
    });
  });

  describe('getMonthlyPaymentMonitoring', () => {
    it('should return monthly payment monitoring data', async () => {
      const mockPendingDues = [
        { userId: 'user-1', vendorId: 'vendor-1', pendingAmount: 100 },
        { userId: 'user-2', vendorId: 'vendor-1', pendingAmount: 200 },
      ];
      mockMonthlyLedgerService.getPendingDues.mockResolvedValue(mockPendingDues);

      const result = await service.getMonthlyPaymentMonitoring(1, 2024);

      expect(mockMonthlyLedgerService.getPendingDues).toHaveBeenCalledWith(1, 2024);
      expect(result).toBe(mockPendingDues);
    });

    it('should use current month/year when not provided', async () => {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      mockMonthlyLedgerService.getPendingDues.mockResolvedValue([]);

      await service.getMonthlyPaymentMonitoring();

      expect(mockMonthlyLedgerService.getPendingDues).toHaveBeenCalledWith(currentMonth, currentYear);
    });
  });

  describe('exportPendingDuesReport', () => {
    it('should generate pending dues report successfully', async () => {
      const month = 1;
      const year = 2024;

      const result = await service.exportPendingDuesReport(month, year);

      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('report_generated', {
        reportType: 'pending_dues',
        month,
        year,
        generatedBy: 'admin',
      });
      expect(result.message).toBe('Pending dues report generated successfully');
      expect(result.reportUrl).toContain(`pending-dues-${month}-${year}.csv`);
    });
  });
});
