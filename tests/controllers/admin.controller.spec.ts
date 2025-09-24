import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../../src/admin/admin.controller';
import { AdminService } from '../../src/admin/admin.service';
import { UserRole, CustomerRole } from '../../src/common/interfaces/user.interface';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;

  const mockUser = {
    id: 'admin-id',
    phone: '+1234567890',
    name: 'Admin User',
    email: 'admin@example.com',
    addresses: [],
    walletBalance: 0,
    role: CustomerRole.ADMIN,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    adminService = {
      getDashboardStats: jest.fn(),
      getAllUsers: jest.fn(),
      updateUserStatus: jest.fn(),
      getPendingVendorApprovals: jest.fn(),
      approveVendor: jest.fn(),
      rejectVendor: jest.fn(),
      getMonthlyPaymentMonitoring: jest.fn(),
      exportPendingDuesReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: adminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      const expectedStats = {
        totalUsers: 100,
        totalVendors: 20,
        totalDeliveryRiders: 50,
        activeUsers: 80,
        pendingVendorApprovals: 5,
        totalPendingDues: 1500,
        monthlyRevenue: 25000,
      };

      adminService.getDashboardStats.mockResolvedValue(expectedStats);

      const result = await controller.getDashboardStats(mockUser);

      expect(adminService.getDashboardStats).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without filters', async () => {
      const users = [
        { id: 'user-1', phone: '+1234567890', role: UserRole.CUSTOMER, isActive: true },
        { id: 'user-2', phone: '+0987654321', role: UserRole.VENDOR, isActive: true },
      ];

      adminService.getAllUsers.mockResolvedValue(users);

      const result = await controller.getAllUsers(mockUser);

      expect(adminService.getAllUsers).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(users);
    });

    it('should return users with role filter', async () => {
      const users = [
        { id: 'user-1', phone: '+1234567890', role: UserRole.CUSTOMER, isActive: true },
      ];

      adminService.getAllUsers.mockResolvedValue(users);

      const result = await controller.getAllUsers(mockUser, UserRole.CUSTOMER);

      expect(adminService.getAllUsers).toHaveBeenCalledWith(UserRole.CUSTOMER, undefined);
      expect(result).toEqual(users);
    });

    it('should return users with status filter', async () => {
      const users = [
        { id: 'user-1', phone: '+1234567890', role: UserRole.CUSTOMER, isActive: true },
      ];

      adminService.getAllUsers.mockResolvedValue(users);

      const result = await controller.getAllUsers(mockUser, undefined, 'active');

      expect(adminService.getAllUsers).toHaveBeenCalledWith(undefined, 'active');
      expect(result).toEqual(users);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const updateDto = { isActive: false };
      const expectedResult = { message: 'User deactivated successfully' };

      adminService.updateUserStatus.mockResolvedValue(expectedResult);

      const result = await controller.updateUserStatus('user-id', updateDto, mockUser);

      expect(adminService.updateUserStatus).toHaveBeenCalledWith('user-id', false);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPendingVendorApprovals', () => {
    it('should return pending vendor approvals', async () => {
      const approvals = [
        { id: 'vendor-1', businessName: 'Vendor 1', status: 'pending_approval' },
        { id: 'vendor-2', businessName: 'Vendor 2', status: 'pending_approval' },
      ];

      adminService.getPendingVendorApprovals.mockResolvedValue(approvals);

      const result = await controller.getPendingVendorApprovals(mockUser);

      expect(adminService.getPendingVendorApprovals).toHaveBeenCalled();
      expect(result).toEqual(approvals);
    });
  });

  describe('approveVendor', () => {
    it('should approve vendor successfully', async () => {
      const expectedResult = { message: 'Vendor approved successfully' };

      adminService.approveVendor.mockResolvedValue(expectedResult);

      const result = await controller.approveVendor('vendor-id', mockUser);

      expect(adminService.approveVendor).toHaveBeenCalledWith('vendor-id');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('rejectVendor', () => {
    it('should reject vendor successfully', async () => {
      const rejectDto = { reason: 'Incomplete documentation' };
      const expectedResult = { message: 'Vendor rejected successfully' };

      adminService.rejectVendor.mockResolvedValue(expectedResult);

      const result = await controller.rejectVendor('vendor-id', rejectDto, mockUser);

      expect(adminService.rejectVendor).toHaveBeenCalledWith('vendor-id', 'Incomplete documentation');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMonthlyPaymentMonitoring', () => {
    it('should return monthly payment monitoring data', async () => {
      const monitoringData = [
        { vendorId: 'vendor-1', userId: 'user-1', pendingAmount: 100 },
        { vendorId: 'vendor-2', userId: 'user-2', pendingAmount: 200 },
      ];

      adminService.getMonthlyPaymentMonitoring.mockResolvedValue(monitoringData);

      const result = await controller.getMonthlyPaymentMonitoring(mockUser, '1', '2024');

      expect(adminService.getMonthlyPaymentMonitoring).toHaveBeenCalledWith(1, 2024);
      expect(result).toEqual(monitoringData);
    });

    it('should handle undefined month and year', async () => {
      const monitoringData = [];

      adminService.getMonthlyPaymentMonitoring.mockResolvedValue(monitoringData);

      const result = await controller.getMonthlyPaymentMonitoring(mockUser);

      expect(adminService.getMonthlyPaymentMonitoring).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(monitoringData);
    });
  });

  describe('exportPendingDuesReport', () => {
    it('should generate pending dues report', async () => {
      const reportDto = { month: 1, year: 2024 };
      const expectedResult = {
        message: 'Pending dues report generated successfully',
        reportUrl: 'https://example.com/reports/pending-dues-1-2024.csv',
      };

      adminService.exportPendingDuesReport.mockResolvedValue(expectedResult);

      const result = await controller.exportPendingDuesReport(reportDto, mockUser);

      expect(adminService.exportPendingDuesReport).toHaveBeenCalledWith(1, 2024);
      expect(result).toEqual(expectedResult);
    });
  });
});