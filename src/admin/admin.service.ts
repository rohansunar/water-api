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
      // In a real implementation, these would be database queries
      // For now, we'll simulate the data
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // For now, we'll simulate pending dues data
      // In a real implementation, this would aggregate from all vendors
      const totalPendingDues = 0; // TODO: Implement with new ledger system

      // Get moderation stats
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

      const stats: AdminDashboardStats = {
        totalUsers: 150, // Simulated data
        totalVendors: 25,
        totalDeliveryRiders: 40,
        activeUsers: 135,
        pendingVendorApprovals: 3,
        totalPendingDues,
        monthlyRevenue: 45000,
        pendingProductModerations,
        flaggedProducts,
      };

      this.logger.log('Generated admin dashboard stats');
      return stats;
    } catch (error) {
      this.logger.error('Failed to generate dashboard stats:', error);
      throw new BadRequestException('Failed to retrieve dashboard statistics');
    }
  }

  async getAllUsers(
    role?: UserRole,
    status?: 'active' | 'inactive',
  ): Promise<UserManagementDto[]> {
    try {
      // In a real implementation, this would query the database with filters
      // For now, we'll return simulated data
      const users: UserManagementDto[] = [
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

      let filteredUsers = users;

      if (role) {
        filteredUsers = filteredUsers.filter((user) => user.role === role);
      }

      if (status) {
        filteredUsers = filteredUsers.filter((user) =>
          status === 'active' ? user.isActive : !user.isActive,
        );
      }

      this.logger.log(
        `Retrieved ${filteredUsers.length} users with filters: role=${role}, status=${status}`,
      );
      return filteredUsers;
    } catch (error) {
      this.logger.error('Failed to retrieve users:', error);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
  ): Promise<{ message: string }> {
    try {
      await this.userService.update(userId, { isActive });

      this.logger.log(
        `Updated user ${userId} status to ${isActive ? 'active' : 'inactive'}`,
      );
      this.customLogger.logBusinessEvent('user_status_updated', {
        userId,
        isActive,
        updatedBy: 'admin',
      });

      return {
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} status:`, error);
      throw new BadRequestException('Failed to update user status');
    }
  }

  async getPendingVendorApprovals(): Promise<VendorApprovalDto[]> {
    try {
      // In a real implementation, this would query vendors with pending status
      const pendingApprovals: VendorApprovalDto[] = [
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

  async approveVendor(vendorId: string): Promise<{ message: string }> {
    try {
      // In a real implementation, this would update the vendor status in database
      this.logger.log(`Approved vendor ${vendorId}`);
      this.customLogger.logBusinessEvent('vendor_approved', {
        vendorId,
        approvedBy: 'admin',
        approvedAt: new Date(),
      });

      return {
        message: 'Vendor approved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to approve vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to approve vendor');
    }
  }

  async rejectVendor(
    vendorId: string,
    reason: string,
  ): Promise<{ message: string }> {
    try {
      // In a real implementation, this would update the vendor status in database
      this.logger.log(`Rejected vendor ${vendorId} with reason: ${reason}`);
      this.customLogger.logBusinessEvent('vendor_rejected', {
        vendorId,
        reason,
        rejectedBy: 'admin',
        rejectedAt: new Date(),
      });

      return {
        message: 'Vendor rejected successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to reject vendor ${vendorId}:`, error);
      throw new BadRequestException('Failed to reject vendor');
    }
  }

  async getMonthlyPaymentMonitoring(
    month?: number,
    year?: number,
  ): Promise<LedgerSummaryResponseDto[]> {
    try {
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      // TODO: Implement with new ledger system
      const pendingDues: any[] = [];

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

  async exportPendingDuesReport(
    month: number,
    year: number,
  ): Promise<{ message: string; reportUrl: string }> {
    try {
      // In a real implementation, this would generate a CSV/Excel file
      const reportUrl = `https://api.example.com/reports/pending-dues-${month}-${year}.csv`;

      this.logger.log(`Generated pending dues report for ${month}/${year}`);
      this.customLogger.logBusinessEvent('report_generated', {
        reportType: 'pending_dues',
        month,
        year,
        generatedBy: 'admin',
      });

      return {
        message: 'Pending dues report generated successfully',
        reportUrl,
      };
    } catch (error) {
      this.logger.error('Failed to generate pending dues report:', error);
      throw new BadRequestException('Failed to generate report');
    }
  }
}
