import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../modules/user/services/user.service';
import { VendorService } from '../vendor/vendor.service';
import { LedgerService } from '../ledger/ledger.service';
import { User, UserRole } from '../common/interfaces/user.interface';
import { LedgerSummaryResponseDto } from '../common/dto/ledger.dto';
import { CustomLoggerService } from '../common/logger/logger.service';
import { ProductModerationService } from '../product/product-moderation.service';

export interface AdminDashboardStats {
  totalUsers: number;
  totalVendors: number;
  totalDeliveryRiders: number;
  activeUsers: number;
  pendingVendorApprovals: number;
  totalPendingDues: number;
  monthlyRevenue: number;
  pendingProductModerations: number;
  flaggedProducts: number;
}

export interface UserManagementDto {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorApprovalDto {
  id: string;
  userId: string;
  businessName: string;
  phone: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  documents?: {
    kycDoc?: string;
    businessLicense?: string;
  };
  createdAt: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
    private readonly ledgerService: LedgerService,
    private readonly customLogger: CustomLoggerService,
    private readonly productModerationService: ProductModerationService,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const totalPendingDues = 0; // TODO: Implement with new ledger system
      const moderationStats = await this.getModerationStats();

      const stats = this.buildDashboardStats(totalPendingDues, moderationStats);

      this.logger.log('Generated admin dashboard stats');
      return stats;
    } catch (error) {
      this.logger.error('Failed to generate dashboard stats:', error);
      throw new BadRequestException('Failed to retrieve dashboard statistics');
    }
  }

  private async getModerationStats(): Promise<{ pendingProductModerations: number; flaggedProducts: number }> {
    let pendingProductModerations = 0;
    let flaggedProducts = 0;
    try {
      const moderationStats = await this.productModerationService.getModerationStats();
      pendingProductModerations = moderationStats.totalPending;
      flaggedProducts = moderationStats.totalFlagged;
    } catch (error) {
      this.logger.error('Failed to get moderation stats:', error);
      // Continue with default values
    }
    return { pendingProductModerations, flaggedProducts };
  }

  private buildDashboardStats(
    totalPendingDues: number,
    moderationStats: { pendingProductModerations: number; flaggedProducts: number },
  ): AdminDashboardStats {
    return {
      totalUsers: 150, // Simulated data
      totalVendors: 25,
      totalDeliveryRiders: 40,
      activeUsers: 135,
      pendingVendorApprovals: 3,
      totalPendingDues,
      monthlyRevenue: 45000,
      pendingProductModerations: moderationStats.pendingProductModerations,
      flaggedProducts: moderationStats.flaggedProducts,
    };
  }

  async getAllUsers(
    role?: UserRole,
    status?: 'active' | 'inactive',
  ): Promise<UserManagementDto[]> {
    try {
      const users = this.getSimulatedUsers();
      const filteredUsers = this.filterUsers(users, role, status);

      this.logger.log(
        `Retrieved ${filteredUsers.length} users with filters: role=${role}, status=${status}`,
      );
      return filteredUsers;
    } catch (error) {
      this.logger.error('Failed to retrieve users:', error);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  private getSimulatedUsers(): UserManagementDto[] {
    return [
      {
        id: '1',
        phone: '9999999999',
        name: 'Test Customer',
        role: UserRole.CUSTOMER,
        isActive: true,
        monthlyPaymentMode: false,
        walletBalance: 500,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        phone: '8888888888',
        name: 'Test Vendor',
        role: UserRole.VENDOR,
        isActive: true,
        monthlyPaymentMode: false,
        walletBalance: 1000,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: '3',
        phone: '7777777777',
        name: 'Test Rider',
        role: UserRole.DELIVERY_RIDER,
        isActive: true,
        monthlyPaymentMode: false,
        walletBalance: 200,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      },
    ];
  }

  private filterUsers(
    users: UserManagementDto[],
    role?: UserRole,
    status?: 'active' | 'inactive',
  ): UserManagementDto[] {
    let filteredUsers = users;

    if (role) {
      filteredUsers = filteredUsers.filter((user) => user.role === role);
    }

    if (status) {
      filteredUsers = filteredUsers.filter((user) =>
        status === 'active' ? user.isActive : !user.isActive,
      );
    }

    return filteredUsers;
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<{ message: string }> {
    try {
      await this.performUserUpdate(userId, isActive);
      this.logUserStatusUpdate(userId, isActive);

      return {
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} status:`, error);
      throw new BadRequestException('Failed to update user status');
    }
  }

  private async performUserUpdate(userId: string, isActive: boolean): Promise<void> {
    await this.userService.update(userId, { isActive });
  }

  private logUserStatusUpdate(userId: string, isActive: boolean): void {
    this.logger.log(
      `Updated user ${userId} status to ${isActive ? 'active' : 'inactive'}`,
    );
    this.customLogger.logBusinessEvent('user_status_updated', {
      userId,
      isActive,
      updatedBy: 'admin',
    });
  }

  async getPendingVendorApprovals(): Promise<VendorApprovalDto[]> {
    try {
      const pendingApprovals = this.getSimulatedPendingApprovals();

      this.logger.log(
        `Retrieved ${pendingApprovals.length} pending vendor approvals`,
      );
      return pendingApprovals;
    } catch (error) {
      this.logger.error('Failed to retrieve pending vendor approvals:', error);
      throw new BadRequestException(
        'Failed to retrieve pending vendor approvals',
      );
    }
  }

  private getSimulatedPendingApprovals(): VendorApprovalDto[] {
    return [
      {
        id: '1',
        userId: '4',
        businessName: 'Pure Water Solutions',
        phone: '9876543210',
        status: 'pending_approval',
        documents: {
          kycDoc: 'kyc_doc_url_1.pdf',
          businessLicense: 'license_url_1.pdf',
        },
        createdAt: new Date('2024-01-25'),
      },
      {
        id: '2',
        userId: '5',
        businessName: 'Fresh Water Co.',
        phone: '9876543211',
        status: 'pending_approval',
        documents: {
          kycDoc: 'kyc_doc_url_2.pdf',
          businessLicense: 'license_url_2.pdf',
        },
        createdAt: new Date('2024-01-26'),
      },
    ];
  }

  async approveVendor(vendorId: string): Promise<{ message: string }> {
    try {
      // In a real implementation, this would update the vendor status in database
      this.logVendorApproval(vendorId);

      return {
        message: 'Vendor approved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to approve vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to approve vendor');
    }
  }

  private logVendorApproval(vendorId: string): void {
    this.logger.log(`Approved vendor ${vendorId}`);
    this.customLogger.logBusinessEvent('vendor_approved', {
      vendorId,
      approvedBy: 'admin',
      approvedAt: new Date(),
    });
  }

  async rejectVendor(
    vendorId: string,
    reason: string,
  ): Promise<{ message: string }> {
    try {
      // In a real implementation, this would update the vendor status in database
      this.logVendorRejection(vendorId, reason);

      return {
        message: 'Vendor rejected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to reject vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to reject vendor');
    }
  }

  private logVendorRejection(vendorId: string, reason: string): void {
    this.logger.log(`Rejected vendor ${vendorId} with reason: ${reason}`);
    this.customLogger.logBusinessEvent('vendor_rejected', {
      vendorId,
      reason,
      rejectedBy: 'admin',
      rejectedAt: new Date(),
    });
  }

  async getMonthlyPaymentMonitoring(
    month?: number,
    year?: number,
  ): Promise<LedgerSummaryResponseDto[]> {
    try {
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      const pendingDues = this.getPendingDuesData(targetMonth, targetYear);

      this.logger.log(
        `Retrieved monthly payment monitoring for ${targetMonth}/${targetYear}: ${pendingDues.length} entries`,
      );
      return pendingDues;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve monthly payment monitoring:',
        error,
      );
      throw new BadRequestException(
        'Failed to retrieve monthly payment monitoring data',
      );
    }
  }

  private getPendingDuesData(month: number, year: number): any[] {
    // TODO: Implement with new ledger system
    return [];
  }

  async exportPendingDuesReport(
    month: number,
    year: number,
  ): Promise<{ message: string; reportUrl: string }> {
    try {
      const reportUrl = this.generateReportUrl(month, year);
      this.logReportGeneration(month, year);

      return {
        message: 'Pending dues report generated successfully',
        reportUrl,
      };
    } catch (error) {
      this.logger.error('Failed to generate pending dues report:', error);
      throw new BadRequestException('Failed to generate report');
    }
  }

  private generateReportUrl(month: number, year: number): string {
    // In a real implementation, this would generate a CSV/Excel file
    return `https://api.example.com/reports/pending-dues-${month}-${year}.csv`;
  }

  private logReportGeneration(month: number, year: number): void {
    this.logger.log(`Generated pending dues report for ${month}/${year}`);
    this.customLogger.logBusinessEvent('report_generated', {
      reportType: 'pending_dues',
      month,
      year,
      generatedBy: 'admin',
    });
  }
}
