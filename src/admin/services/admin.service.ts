import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { UserService } from '../../modules/user/services/user.service';
import { VendorService } from '../../vendor/vendor.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { User, UserRole } from '../../common/interfaces/user.interface';
import { LedgerSummaryResponseDto } from '../../common/dto/ledger.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ProductModerationService } from '../../product/services/product-moderation.service';
import {
  AdminPaginationQueryDto,
  AdminPaginatedResponseDto,
  AdminUserListResponseDto,
  AdminTransactionListQueryDto,
} from '../../common/dto/admin.dto';
import {
  ComplaintResponseDto,
  ComplaintListQueryDto,
} from '../../common/dto/complaint.dto';
import {
  ProductResponseDto,
  ProductSearchDto,
} from '../../common/dto/product.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';
import {
  AdminOrderQueryDto,
  AdminOrderResponseDto,
} from '../../common/dto/order-management.dto';
import { OrderStatus } from '../../common/interfaces/order.interface';
import {
  LedgerEntryResponseDto,
  PayoutResponseDto,
} from '../../common/dto/ledger.dto';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
} from '../../common/interfaces/ledger.interface';

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

  private async getModerationStats(): Promise<{
    pendingProductModerations: number;
    flaggedProducts: number;
  }> {
    let pendingProductModerations = 0;
    let flaggedProducts = 0;
    try {
      const moderationStats =
        await this.productModerationService.getModerationStats();
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
    moderationStats: {
      pendingProductModerations: number;
      flaggedProducts: number;
    },
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
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const users = this.getSimulatedUsers();
      const filteredUsers = this.filterUsers(
        users,
        query.role,
        query.status,
        query.search,
      );

      // Apply pagination
      const paginatedUsers = filteredUsers.slice(skip, skip + limit);

      const total = filteredUsers.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedUsers,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedUsers.length} users (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve users:', error);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  async getAllCustomers(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const users = this.getSimulatedUsers();
      const customers = users.filter((user) => user.role === UserRole.CUSTOMER);
      const filteredCustomers = this.filterUsers(
        customers,
        query.role,
        query.status,
        query.search,
      );

      // Apply pagination
      const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

      const total = filteredCustomers.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedCustomers,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedCustomers.length} customers (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve customers:', error);
      throw new BadRequestException('Failed to retrieve customers');
    }
  }

  async getAllVendors(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const users = this.getSimulatedUsers();
      const vendors = users.filter((user) => user.role === UserRole.VENDOR);
      const filteredVendors = this.filterUsers(
        vendors,
        query.role,
        query.status,
        query.search,
      );

      // Apply pagination
      const paginatedVendors = filteredVendors.slice(skip, skip + limit);

      const total = filteredVendors.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedVendors,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedVendors.length} vendors (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve vendors:', error);
      throw new BadRequestException('Failed to retrieve vendors');
    }
  }

  async getAllRiders(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const users = this.getSimulatedUsers();
      const riders = users.filter(
        (user) => user.role === UserRole.DELIVERY_RIDER,
      );
      const filteredRiders = this.filterUsers(
        riders,
        query.role,
        query.status,
        query.search,
      );

      // Apply pagination
      const paginatedRiders = filteredRiders.slice(skip, skip + limit);

      const total = filteredRiders.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedRiders,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedRiders.length} riders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve riders:', error);
      throw new BadRequestException('Failed to retrieve riders');
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
    search?: string,
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

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchLower) ||
          user.phone.includes(searchLower),
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

  private async performUserUpdate(
    userId: string,
    isActive: boolean,
  ): Promise<void> {
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

  // Order Management Methods
  async getOrders(
    query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const orders = this.getSimulatedOrders();
      const filteredOrders = this.filterOrders(orders, query);

      // Apply pagination
      const paginatedOrders = filteredOrders.slice(skip, skip + limit);

      const total = filteredOrders.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedOrders,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedOrders.length} orders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve orders:', error);
      throw new BadRequestException('Failed to retrieve orders');
    }
  }

  async getPendingOrders(
    query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const orders = this.getSimulatedOrders();
      const pendingOrders = orders.filter(
        (order) => order.status === OrderStatus.PENDING,
      );
      const filteredOrders = this.filterOrders(pendingOrders, query);

      // Apply pagination
      const paginatedOrders = filteredOrders.slice(skip, skip + limit);

      const total = filteredOrders.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedOrders,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedOrders.length} pending orders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve pending orders:', error);
      throw new BadRequestException('Failed to retrieve pending orders');
    }
  }

  async getCompletedOrders(
    query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const orders = this.getSimulatedOrders();
      const completedOrders = orders.filter(
        (order) => order.status === OrderStatus.DELIVERED,
      );
      const filteredOrders = this.filterOrders(completedOrders, query);

      // Apply pagination
      const paginatedOrders = filteredOrders.slice(skip, skip + limit);

      const total = filteredOrders.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedOrders,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedOrders.length} completed orders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve completed orders:', error);
      throw new BadRequestException('Failed to retrieve completed orders');
    }
  }

  async getCancelledOrders(
    query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const orders = this.getSimulatedOrders();
      const cancelledOrders = orders.filter(
        (order) => order.status === OrderStatus.CANCELLED,
      );
      const filteredOrders = this.filterOrders(cancelledOrders, query);

      // Apply pagination
      const paginatedOrders = filteredOrders.slice(skip, skip + limit);

      const total = filteredOrders.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedOrders,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedOrders.length} cancelled orders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve cancelled orders:', error);
      throw new BadRequestException('Failed to retrieve cancelled orders');
    }
  }

  private getSimulatedOrders(): AdminOrderResponseDto[] {
    return [
      {
        id: BigInt(1),
        orderUuid: 'order-123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-001-2024',
        customerId: BigInt(1),
        customerName: 'John Doe',
        vendorId: BigInt(1),
        vendorName: 'Fresh Water Co.',
        status: OrderStatus.PENDING,
        totalAmount: 150.5,
        paymentStatus: 'completed',
        hasDisputes: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: BigInt(2),
        orderUuid: 'order-123e4567-e89b-12d3-a456-426614174001',
        orderNumber: 'ORD-002-2024',
        customerId: BigInt(2),
        customerName: 'Jane Smith',
        vendorId: BigInt(2),
        vendorName: 'Pure Water Solutions',
        status: OrderStatus.DELIVERED,
        totalAmount: 200.0,
        paymentStatus: 'completed',
        hasDisputes: false,
        createdAt: new Date('2024-01-14T14:20:00Z'),
        updatedAt: new Date('2024-01-14T16:45:00Z'),
      },
      {
        id: BigInt(3),
        orderUuid: 'order-123e4567-e89b-12d3-a456-426614174002',
        orderNumber: 'ORD-003-2024',
        customerId: BigInt(3),
        customerName: 'Bob Johnson',
        vendorId: BigInt(1),
        vendorName: 'Fresh Water Co.',
        status: OrderStatus.CANCELLED,
        totalAmount: 75.25,
        paymentStatus: 'refunded',
        hasDisputes: true,
        createdAt: new Date('2024-01-13T09:15:00Z'),
        updatedAt: new Date('2024-01-13T11:30:00Z'),
      },
    ];
  }

  private filterOrders(
    orders: AdminOrderResponseDto[],
    query: AdminOrderQueryDto,
  ): AdminOrderResponseDto[] {
    let filteredOrders = orders;

    if (query.status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === query.status,
      );
    }

    if (query.customerId) {
      filteredOrders = filteredOrders.filter(
        (order) => order.customerId.toString() === query.customerId,
      );
    }

    if (query.vendorId) {
      filteredOrders = filteredOrders.filter(
        (order) => order.vendorId?.toString() === query.vendorId,
      );
    }

    if (query.disputed !== undefined) {
      filteredOrders = filteredOrders.filter(
        (order) => order.hasDisputes === query.disputed,
      );
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredOrders = filteredOrders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName.toLowerCase().includes(searchLower) ||
          order.vendorName?.toLowerCase().includes(searchLower),
      );
    }

    return filteredOrders;
  }

  // Financial Management Methods
  async getTransactions(
    query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<LedgerEntryResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const transactions = this.getSimulatedTransactions();
      const filteredTransactions = this.filterTransactions(transactions, query);

      // Apply pagination
      const paginatedTransactions = filteredTransactions.slice(
        skip,
        skip + limit,
      );

      const total = filteredTransactions.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedTransactions,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedTransactions.length} transactions (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve transactions:', error);
      throw new BadRequestException('Failed to retrieve transactions');
    }
  }

  async getPayouts(
    query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<PayoutResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const payouts = this.getSimulatedPayouts();
      const filteredPayouts = this.filterPayouts(payouts, query);

      // Apply pagination
      const paginatedPayouts = filteredPayouts.slice(skip, skip + limit);

      const total = filteredPayouts.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedPayouts,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedPayouts.length} payouts (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve payouts:', error);
      throw new BadRequestException('Failed to retrieve payouts');
    }
  }

  async getCommissions(
    query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<LedgerEntryResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const transactions = this.getSimulatedTransactions();
      const commissions = transactions.filter(
        (t) => t.type === LedgerEntryType.COMMISSION,
      );
      const filteredCommissions = this.filterTransactions(commissions, query);

      // Apply pagination
      const paginatedCommissions = filteredCommissions.slice(
        skip,
        skip + limit,
      );

      const total = filteredCommissions.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedCommissions,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedCommissions.length} commissions (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve commissions:', error);
      throw new BadRequestException('Failed to retrieve commissions');
    }
  }

  private getSimulatedTransactions(): LedgerEntryResponseDto[] {
    return [
      {
        id: '1',
        vendorId: 'vendor-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 150.5,
        type: LedgerEntryType.SALE,
        status: LedgerEntryStatus.COMPLETED,
        description: 'Payment for order ORD-001-2024',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '2',
        vendorId: 'vendor-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 15.05,
        type: LedgerEntryType.COMMISSION,
        status: LedgerEntryStatus.COMPLETED,
        description: 'Commission for order ORD-001-2024',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '3',
        vendorId: 'vendor-2',
        orderId: 'order-2',
        userId: 'user-2',
        amount: 200.0,
        type: LedgerEntryType.SALE,
        status: LedgerEntryStatus.COMPLETED,
        description: 'Payment for order ORD-002-2024',
        createdAt: new Date('2024-01-14T14:20:00Z'),
        updatedAt: new Date('2024-01-14T14:20:00Z'),
      },
    ];
  }

  private getSimulatedPayouts(): PayoutResponseDto[] {
    return [
      {
        id: '1',
        vendorId: 'vendor-1',
        amount: 135.45,
        status: PayoutStatus.COMPLETED,
        method: PayoutMethod.BANK_TRANSFER,
        transactionId: 'TXN_123456789',
        processedAt: new Date('2024-01-15T11:00:00Z'),
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T11:00:00Z'),
      },
      {
        id: '2',
        vendorId: 'vendor-2',
        amount: 180.0,
        status: PayoutStatus.PENDING,
        method: PayoutMethod.UPI,
        createdAt: new Date('2024-01-14T15:00:00Z'),
        updatedAt: new Date('2024-01-14T15:00:00Z'),
      },
    ];
  }

  private filterTransactions(
    transactions: LedgerEntryResponseDto[],
    query: AdminTransactionListQueryDto,
  ): LedgerEntryResponseDto[] {
    let filteredTransactions = transactions;

    if (query.type) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.type === query.type,
      );
    }

    if (query.userId) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.userId === query.userId,
      );
    }

    if (query.amountMin !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.amount >= query.amountMin!,
      );
    }

    if (query.amountMax !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.amount <= query.amountMax!,
      );
    }

    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      filteredTransactions = filteredTransactions.filter(
        (t) => t.createdAt >= dateFrom,
      );
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      filteredTransactions = filteredTransactions.filter(
        (t) => t.createdAt <= dateTo,
      );
    }

    return filteredTransactions;
  }

  private filterPayouts(
    payouts: PayoutResponseDto[],
    query: AdminTransactionListQueryDto,
  ): PayoutResponseDto[] {
    let filteredPayouts = payouts;

    if (query.userId) {
      filteredPayouts = filteredPayouts.filter(
        (p) => p.vendorId === query.userId,
      );
    }

    if (query.amountMin !== undefined) {
      filteredPayouts = filteredPayouts.filter(
        (p) => p.amount >= query.amountMin!,
      );
    }

    if (query.amountMax !== undefined) {
      filteredPayouts = filteredPayouts.filter(
        (p) => p.amount <= query.amountMax!,
      );
    }

    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      filteredPayouts = filteredPayouts.filter((p) => p.createdAt >= dateFrom);
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      filteredPayouts = filteredPayouts.filter((p) => p.createdAt <= dateTo);
    }

    return filteredPayouts;
  }

  // Complaint Management Methods
  async getComplaints(
    query: ComplaintListQueryDto,
  ): Promise<AdminPaginatedResponseDto<ComplaintResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const complaints = this.getSimulatedComplaints();
      const filteredComplaints = this.filterComplaints(complaints, query);

      // Apply pagination
      const paginatedComplaints = filteredComplaints.slice(skip, skip + limit);

      const total = filteredComplaints.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedComplaints,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedComplaints.length} complaints (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve complaints:', error);
      throw new BadRequestException('Failed to retrieve complaints');
    }
  }

  private getSimulatedComplaints(): ComplaintResponseDto[] {
    return [
      {
        id: '1',
        userId: 'user-1',
        orderId: 'order-1',
        type: 'delivery_delay',
        subject: 'Late delivery complaint',
        message: 'My order was delivered 2 hours late',
        status: 'open',
        priority: 'high',
        attachments: ['photo1.jpg', 'photo2.jpg'],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '2',
        userId: 'user-2',
        orderId: 'order-2',
        type: 'product_quality',
        subject: 'Poor product quality',
        message: 'The water bottles were damaged',
        status: 'resolved',
        priority: 'medium',
        resolution: 'Refund processed successfully',
        attachments: ['damage1.jpg'],
        createdAt: new Date('2024-01-14T14:20:00Z'),
        updatedAt: new Date('2024-01-14T16:45:00Z'),
        resolvedAt: new Date('2024-01-14T16:45:00Z'),
      },
    ];
  }

  private filterComplaints(
    complaints: ComplaintResponseDto[],
    query: ComplaintListQueryDto,
  ): ComplaintResponseDto[] {
    let filteredComplaints = complaints;

    if (query.type) {
      filteredComplaints = filteredComplaints.filter(
        (c) => c.type === query.type,
      );
    }

    if (query.status) {
      filteredComplaints = filteredComplaints.filter(
        (c) => c.status === query.status,
      );
    }

    if (query.priority) {
      filteredComplaints = filteredComplaints.filter(
        (c) => c.priority === query.priority,
      );
    }

    if (query.userId) {
      filteredComplaints = filteredComplaints.filter(
        (c) => c.userId === query.userId,
      );
    }

    return filteredComplaints;
  }

  // Content Management Methods
  async getProducts(
    query: ProductSearchDto,
  ): Promise<AdminPaginatedResponseDto<ProductResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page || 1,
        query.limit || 20,
      );

      const products = this.getSimulatedProducts();
      const filteredProducts = this.filterProducts(products, query);

      // Apply pagination
      const paginatedProducts = filteredProducts.slice(skip, skip + limit);

      const total = filteredProducts.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedProducts,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedProducts.length} products (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve products:', error);
      throw new BadRequestException('Failed to retrieve products');
    }
  }

  async getReviews(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<any>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const reviews = this.getSimulatedReviews();
      const filteredReviews = this.filterReviews(reviews, query);

      // Apply pagination
      const paginatedReviews = filteredReviews.slice(skip, skip + limit);

      const total = filteredReviews.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedReviews,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedReviews.length} reviews (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve reviews:', error);
      throw new BadRequestException('Failed to retrieve reviews');
    }
  }

  async getReports(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<any>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      const reports = this.getSimulatedReports();
      const filteredReports = this.filterReports(reports, query);

      // Apply pagination
      const paginatedReports = filteredReports.slice(skip, skip + limit);

      const total = filteredReports.length;
      const response = PaginationUtil.createPaginatedResponse(
        paginatedReports,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${paginatedReports.length} reports (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve reports:', error);
      throw new BadRequestException('Failed to retrieve reports');
    }
  }

  private getSimulatedProducts(): ProductResponseDto[] {
    return [
      {
        id: '1',
        vendorId: 'vendor-1',
        name: 'Premium Water Bottle 1L',
        description: 'High-quality reusable water bottle',
        category: 'water_bottles',
        size: '1L',
        price: 25.0,
        depositAmount: 50.0,
        hasDeposit: true,
        stockQuantity: 100,
        isActive: true,
        images: ['bottle1.jpg', 'bottle2.jpg'],
        specifications: {
          capacity: 1000,
          material: 'Stainless Steel',
          brand: 'AquaBrand',
          weight: 0.5,
          dimensions: { height: 25, diameter: 7 },
        },
        vendor: {
          id: 'vendor-1',
          businessName: 'Fresh Water Co.',
          rating: 4.5,
          totalOrders: 150,
          deliveryZones: [],
        },
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];
  }

  private getSimulatedReviews(): any[] {
    return [
      {
        id: '1',
        productId: 'product-1',
        userId: 'user-1',
        rating: 5,
        comment: 'Excellent quality water bottle!',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];
  }

  private getSimulatedReports(): any[] {
    return [
      {
        id: '1',
        type: 'sales_report',
        title: 'Daily Sales Report',
        generatedAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];
  }

  private filterProducts(
    products: ProductResponseDto[],
    query: ProductSearchDto,
  ): ProductResponseDto[] {
    let filteredProducts = products;

    if (query.query) {
      const searchLower = query.query.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower),
      );
    }

    if (query.category) {
      filteredProducts = filteredProducts.filter(
        (p) => p.category === query.category,
      );
    }

    return filteredProducts;
  }

  private filterReviews(reviews: any[], query: AdminPaginationQueryDto): any[] {
    // Simple filtering logic - in real implementation would be more complex
    return reviews;
  }

  private filterReports(reports: any[], query: AdminPaginationQueryDto): any[] {
    // Simple filtering logic - in real implementation would be more complex
    return reports;
  }
}
