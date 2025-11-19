import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VendorService } from '../../vendor/services/vendor.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { LedgerSummaryResponseDto } from '../../ledger/dto/ledger.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ProductModerationService } from '../../product/services/product-moderation.service';
import { UserRole } from '../../common/interfaces/user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminPaginationQueryDto,
  AdminPaginatedResponseDto,
  AdminUserListResponseDto,
  AdminTransactionListQueryDto,
  CreateAdminDto,
  UpdateAdminDto,
  AdminResponseDto,
  CreateVendorDto,
  UpdateVendorDto,
  VendorResponseDto,
  CreateRiderDto,
  UpdateRiderDto,
  RiderResponseDto,
} from '../dto/admin.dto';
import {
  ComplaintResponseDto,
  ComplaintListQueryDto,
} from '../../complaint/dto/complaint.dto';
import {
  ProductResponseDto,
  ProductSearchDto,
} from '../../product/dto/product.dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../common/dto/customer.dto';
import { PaginationUtil } from '../../common/utils/pagination.util';
import {
  AdminOrderQueryDto,
  AdminOrderResponseDto,
} from '../dto/order-management.dto';
import { OrderStatus } from '../../order/interfaces/order.interface';
import {
  LedgerEntryResponseDto,
  PayoutResponseDto,
} from '../../ledger/dto/ledger.dto';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
} from '../../ledger/interfaces/ledger.interface';

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
    private readonly vendorService: VendorService,
    private readonly ledgerService: LedgerService,
    private readonly customLogger: CustomLoggerService,
    private readonly productModerationService: ProductModerationService,
    private readonly prisma: PrismaService,
    private readonly adminAuthService: AdminAuthService,
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

  async getAllCustomers(
    query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    try {
      const { page, limit, skip } = PaginationUtil.normalizePagination(
        query.page,
        query.limit,
      );

      // Build where clause for filtering
      const where: any = {
        role: 'CUSTOMER',
        isDeleted: false,
      };

      if (query.status) {
        where.isActive = query.status === 'active';
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.customer.count({
        where: {
          role: 'CUSTOMER',
          isDeleted: false,
        },
      });

      // Get paginated customers
      const customers = await this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          monthlyPaymentMode: true,
          walletBalance: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Transform to response format
      const customerResponses: AdminUserListResponseDto[] = customers.map(
        (customer) => ({
          id: customer.uuid,
          phone: customer.phone,
          name: customer.name || undefined,
          role:
            customer.role === 'CUSTOMER'
              ? UserRole.CUSTOMER
              : customer.role === 'VENDOR'
                ? UserRole.VENDOR
                : customer.role === 'DELIVERY_RIDER'
                  ? UserRole.DELIVERY_RIDER
                  : UserRole.ADMIN,
          isActive: customer.isActive,
          monthlyPaymentMode: customer.monthlyPaymentMode,
          walletBalance: Number(customer.walletBalance),
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        }),
      );

      const response = PaginationUtil.createPaginatedResponse(
        customerResponses,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${customerResponses.length} customers (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
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

      // Build where clause for filtering
      const where: any = {
        isDeleted: false,
      };

      if (query.status) {
        where.isActive = query.status === 'active';
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.vendor.count({ where });

      // Get paginated vendors
      const vendors = await this.prisma.vendor.findMany({
        where,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Transform to response format
      const vendorResponses: AdminUserListResponseDto[] = vendors.map(
        (vendor) => ({
          id: vendor.id.toString(),
          phone: vendor.phone || undefined,
          name: vendor.name,
          role: UserRole.VENDOR,
          isActive: vendor.isActive,
          monthlyPaymentMode: false, // Vendors don't have monthly payment mode
          walletBalance: 0, // Vendors don't have wallet balance in this context
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        }),
      );

      const response = PaginationUtil.createPaginatedResponse(
        vendorResponses,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${vendorResponses.length} vendors (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
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

      // Build where clause for filtering
      const where: any = {
        isDeleted: false,
      };

      if (query.status) {
        where.isActive = query.status === 'active';
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.rider.count({ where });

      // Get paginated riders
      const riders = await this.prisma.rider.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          phone: true,
          email: true,
          name: true,
          status: true,
          rating: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Transform to response format
      const riderResponses: AdminUserListResponseDto[] = riders.map(
        (rider) => ({
          id: rider.uuid,
          phone: rider.phone || undefined,
          name: rider.name,
          role: UserRole.DELIVERY_RIDER,
          isActive: rider.isActive,
          monthlyPaymentMode: false, // Riders don't have monthly payment mode
          walletBalance: 0, // Riders don't have wallet balance in this context
          createdAt: rider.createdAt,
          updatedAt: rider.updatedAt,
        }),
      );

      const response = PaginationUtil.createPaginatedResponse(
        riderResponses,
        total,
        page,
        limit,
      );

      this.logger.log(
        `Retrieved ${riderResponses.length} riders (page ${page}/${response.meta.totalPages}, total: ${total}) with filters: ${JSON.stringify(query)}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve riders:', error);
      throw new BadRequestException('Failed to retrieve riders');
    }
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
        (t) => t.amount >= query.amountMin,
      );
    }

    if (query.amountMax !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.amount <= query.amountMax,
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
        (p) => p.amount >= query.amountMin,
      );
    }

    if (query.amountMax !== undefined) {
      filteredPayouts = filteredPayouts.filter(
        (p) => p.amount <= query.amountMax,
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

  // Admin CRUD Methods
  async getAdminById(id: string): Promise<AdminResponseDto> {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: BigInt(id), isDeleted: false },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      return {
        id: admin.id.toString(),
        uuid: admin.uuid,
        email: admin.email || '',
        phone: admin.phone || undefined,
        name: admin.name,
        roleLevel: admin.roleLevel,
        permissions: (admin.permissions as Record<string, any>) || {},
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastActiveAt: admin.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve admin ${id}:`, error);
      throw error;
    }
  }

  async createAdmin(
    createDto: CreateAdminDto,
    createdBy: string,
  ): Promise<AdminResponseDto> {
    try {
      // Check for existing email
      const existingEmail = await this.prisma.admin.findUnique({
        where: { email: createDto.email },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }

      // Check for existing phone if provided
      if (createDto.phone) {
        const existingPhone = await this.prisma.admin.findUnique({
          where: { phone: createDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      const hashedPassword = await this.adminAuthService.hashPassword(
        createDto.password,
      );

      const admin = await this.prisma.admin.create({
        data: {
          email: createDto.email,
          phone: createDto.phone,
          name: createDto.name,
          roleLevel: createDto.roleLevel,
          permissions: createDto.permissions,
          passwordHash: hashedPassword,
          isActive: true,
        },
      });

      this.logger.log(`Created admin ${admin.id} by ${createdBy}`);

      return {
        id: admin.id.toString(),
        uuid: admin.uuid,
        email: admin.email || '',
        phone: admin.phone || undefined,
        name: admin.name,
        roleLevel: admin.roleLevel,
        permissions: (admin.permissions as Record<string, any>) || {},
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastActiveAt: admin.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create admin:', error);
      throw error;
    }
  }

  async updateAdmin(
    id: string,
    updateDto: UpdateAdminDto,
    updatedBy: string,
  ): Promise<AdminResponseDto> {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: BigInt(id), isDeleted: false },
      });

      if (!existingAdmin) {
        throw new NotFoundException('Admin not found');
      }

      // Check for email uniqueness if updating email
      if (updateDto.email && updateDto.email !== existingAdmin.email) {
        const existingEmail = await this.prisma.admin.findUnique({
          where: { email: updateDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      // Check for phone uniqueness if updating phone
      if (updateDto.phone && updateDto.phone !== existingAdmin.phone) {
        const existingPhone = await this.prisma.admin.findUnique({
          where: { phone: updateDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      const admin = await this.prisma.admin.update({
        where: { id: BigInt(id) },
        data: {
          email: updateDto.email,
          phone: updateDto.phone,
          name: updateDto.name,
          roleLevel: updateDto.roleLevel,
          permissions: updateDto.permissions,
          isActive: updateDto.isActive,
        },
      });

      this.logger.log(`Updated admin ${id} by ${updatedBy}`);

      return {
        id: admin.id.toString(),
        uuid: admin.uuid,
        email: admin.email || '',
        phone: admin.phone || undefined,
        name: admin.name,
        roleLevel: admin.roleLevel,
        permissions: (admin.permissions as Record<string, any>) || {},
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastActiveAt: admin.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to update admin ${id}:`, error);
      throw error;
    }
  }

  async deleteAdmin(
    id: string,
    deletedBy: string,
  ): Promise<{ message: string }> {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: BigInt(id), isDeleted: false },
      });

      if (!existingAdmin) {
        throw new NotFoundException('Admin not found');
      }

      await this.prisma.admin.update({
        where: { id: BigInt(id) },
        data: { isDeleted: true },
      });

      this.logger.log(`Soft deleted admin ${id} by ${deletedBy}`);

      return { message: 'Admin deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete admin ${id}:`, error);
      throw error;
    }
  }

  // Customer CRUD Methods
  async getCustomerById(id: string): Promise<AdminUserListResponseDto> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
        select: {
          id: true,
          uuid: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          monthlyPaymentMode: true,
          walletBalance: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return {
        id: customer.uuid,
        phone: customer.phone,
        name: customer.name || undefined,
        role:
          customer.role === 'CUSTOMER'
            ? UserRole.CUSTOMER
            : customer.role === 'VENDOR'
              ? UserRole.VENDOR
              : customer.role === 'DELIVERY_RIDER'
                ? UserRole.DELIVERY_RIDER
                : UserRole.ADMIN,
        isActive: customer.isActive,
        monthlyPaymentMode: customer.monthlyPaymentMode,
        walletBalance: Number(customer.walletBalance),
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve customer ${id}:`, error);
      throw error;
    }
  }

  async createCustomer(
    createDto: CreateCustomerDto,
    createdBy: string,
  ): Promise<AdminUserListResponseDto> {
    try {
      // Check for existing phone
      const existingPhone = await this.prisma.customer.findUnique({
        where: { phone: createDto.phone },
      });
      if (existingPhone) {
        throw new BadRequestException('Phone number already exists');
      }

      // Check for existing email if provided
      if (createDto.email) {
        const existingEmail = await this.prisma.customer.findUnique({
          where: { email: createDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const customer = await this.prisma.customer.create({
        data: {
          phone: createDto.phone,
          email: createDto.email,
          name: createDto.name,
          role: 'CUSTOMER',
          walletBalance: createDto.walletBalance || 0,
          isActive:
            createDto.isActive !== undefined ? createDto.isActive : true,
          monthlyPaymentMode: createDto.monthlyPaymentMode || false,
        },
        select: {
          id: true,
          uuid: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          monthlyPaymentMode: true,
          walletBalance: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `Created customer ${customer.uuid} by admin ${createdBy}`,
      );

      return {
        id: customer.uuid,
        phone: customer.phone,
        name: customer.name || undefined,
        role: UserRole.CUSTOMER,
        isActive: customer.isActive,
        monthlyPaymentMode: customer.monthlyPaymentMode,
        walletBalance: Number(customer.walletBalance),
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to create customer:', error);
      throw error;
    }
  }

  async updateCustomer(
    id: string,
    updateDto: UpdateCustomerDto,
    updatedBy: string,
  ): Promise<AdminUserListResponseDto> {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      // Check for email uniqueness if updating email
      if (updateDto.email && updateDto.email !== existingCustomer.email) {
        const existingEmail = await this.prisma.customer.findUnique({
          where: { email: updateDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const customer = await this.prisma.customer.update({
        where: { uuid: id },
        data: {
          email: updateDto.email,
          name: updateDto.name,
          isActive: updateDto.isActive,
          monthlyPaymentMode: updateDto.monthlyPaymentMode,
        },
        select: {
          id: true,
          uuid: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          monthlyPaymentMode: true,
          walletBalance: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Updated customer ${id} by admin ${updatedBy}`);

      return {
        id: customer.uuid,
        phone: customer.phone,
        name: customer.name || undefined,
        role: UserRole.CUSTOMER,
        isActive: customer.isActive,
        monthlyPaymentMode: customer.monthlyPaymentMode,
        walletBalance: Number(customer.walletBalance),
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}:`, error);
      throw error;
    }
  }

  async deleteCustomer(
    id: string,
    deletedBy: string,
  ): Promise<{ message: string }> {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      await this.prisma.customer.update({
        where: { uuid: id },
        data: { isDeleted: true },
      });

      this.logger.log(`Soft deleted customer ${id} by admin ${deletedBy}`);

      return { message: 'Customer deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete customer ${id}:`, error);
      throw error;
    }
  }

  // Vendor CRUD Methods
  async getVendorById(id: string): Promise<VendorResponseDto> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: {
          id: BigInt(id),
          isDeleted: false,
        },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      return {
        id: vendor.id.toString(),
        phone: vendor.phone || undefined,
        email: vendor.email || undefined,
        name: vendor.name,
        kycStatus: vendor.kycStatus,
        gstin: vendor.gstin || undefined,
        bankAccountId: vendor.bankAccountId
          ? Number(vendor.bankAccountId)
          : undefined,
        rating: vendor.rating ? Number(vendor.rating) : undefined,
        isVerified: vendor.isVerified,
        isActive: vendor.isActive,
        metadata: (vendor.metadata as Record<string, any>) || undefined,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        lastActiveAt: vendor.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve vendor ${id}:`, error);
      throw error;
    }
  }

  async createVendor(
    createDto: CreateVendorDto,
    createdBy: string,
  ): Promise<VendorResponseDto> {
    try {
      // Check for existing phone if provided
      if (createDto.phone) {
        const existingPhone = await this.prisma.vendor.findUnique({
          where: { phone: createDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      // Check for existing email if provided
      if (createDto.email) {
        const existingEmail = await this.prisma.vendor.findUnique({
          where: { email: createDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const vendor = await this.prisma.vendor.create({
        data: {
          phone: createDto.phone,
          email: createDto.email,
          name: createDto.name,
          gstin: createDto.gstin,
          bankAccountId: createDto.bankAccountId
            ? BigInt(createDto.bankAccountId)
            : undefined,
          metadata: createDto.metadata,
          isActive:
            createDto.isActive !== undefined ? createDto.isActive : true,
        },
      });

      this.logger.log(`Created vendor ${vendor.id} by admin ${createdBy}`);

      return {
        id: vendor.id.toString(),
        phone: vendor.phone || undefined,
        email: vendor.email || undefined,
        name: vendor.name,
        kycStatus: vendor.kycStatus,
        gstin: vendor.gstin || undefined,
        bankAccountId: vendor.bankAccountId
          ? Number(vendor.bankAccountId)
          : undefined,
        rating: vendor.rating ? Number(vendor.rating) : undefined,
        isVerified: vendor.isVerified,
        isActive: vendor.isActive,
        metadata: (vendor.metadata as Record<string, any>) || undefined,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        lastActiveAt: vendor.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create vendor:', error);
      throw error;
    }
  }

  async updateVendor(
    id: string,
    updateDto: UpdateVendorDto,
    updatedBy: string,
  ): Promise<VendorResponseDto> {
    try {
      const existingVendor = await this.prisma.vendor.findUnique({
        where: {
          id: BigInt(id),
          isDeleted: false,
        },
      });

      if (!existingVendor) {
        throw new NotFoundException('Vendor not found');
      }

      // Check for phone uniqueness if updating phone
      if (updateDto.phone && updateDto.phone !== existingVendor.phone) {
        const existingPhone = await this.prisma.vendor.findUnique({
          where: { phone: updateDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      // Check for email uniqueness if updating email
      if (updateDto.email && updateDto.email !== existingVendor.email) {
        const existingEmail = await this.prisma.vendor.findUnique({
          where: { email: updateDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const vendor = await this.prisma.vendor.update({
        where: { id: BigInt(id) },
        data: {
          phone: updateDto.phone,
          email: updateDto.email,
          name: updateDto.name,
          gstin: updateDto.gstin,
          bankAccountId: updateDto.bankAccountId
            ? BigInt(updateDto.bankAccountId)
            : undefined,
          kycStatus: updateDto.kycStatus,
          isVerified: updateDto.isVerified,
          isActive: updateDto.isActive,
          metadata: updateDto.metadata,
        },
      });

      this.logger.log(`Updated vendor ${id} by admin ${updatedBy}`);

      return {
        id: vendor.id.toString(),
        phone: vendor.phone || undefined,
        email: vendor.email || undefined,
        name: vendor.name,
        kycStatus: vendor.kycStatus,
        gstin: vendor.gstin || undefined,
        bankAccountId: vendor.bankAccountId
          ? Number(vendor.bankAccountId)
          : undefined,
        rating: vendor.rating ? Number(vendor.rating) : undefined,
        isVerified: vendor.isVerified,
        isActive: vendor.isActive,
        metadata: (vendor.metadata as Record<string, any>) || undefined,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        lastActiveAt: vendor.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to update vendor ${id}:`, error);
      throw error;
    }
  }

  async deleteVendor(
    id: string,
    deletedBy: string,
  ): Promise<{ message: string }> {
    try {
      const existingVendor = await this.prisma.vendor.findUnique({
        where: {
          id: BigInt(id),
          isDeleted: false,
        },
      });

      if (!existingVendor) {
        throw new NotFoundException('Vendor not found');
      }

      await this.prisma.vendor.update({
        where: { id: BigInt(id) },
        data: { isDeleted: true },
      });

      this.logger.log(`Soft deleted vendor ${id} by admin ${deletedBy}`);

      return { message: 'Vendor deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete vendor ${id}:`, error);
      throw error;
    }
  }

  // Rider CRUD Methods
  async getRiderById(id: string): Promise<RiderResponseDto> {
    try {
      const rider = await this.prisma.rider.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
      });

      if (!rider) {
        throw new NotFoundException('Rider not found');
      }

      return {
        id: rider.id.toString(),
        uuid: rider.uuid,
        phone: rider.phone || undefined,
        email: rider.email || undefined,
        name: rider.name,
        licenseNo: rider.licenseNo || undefined,
        vehicleType: rider.vehicleType || undefined,
        shift: (rider.shift as Record<string, any>) || undefined,
        status: rider.status,
        rating: rider.rating ? Number(rider.rating) : undefined,
        isActive: rider.isActive,
        metadata: (rider.metadata as Record<string, any>) || undefined,
        createdAt: rider.createdAt,
        updatedAt: rider.updatedAt,
        lastActiveAt: rider.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve rider ${id}:`, error);
      throw error;
    }
  }

  async createRider(
    createDto: CreateRiderDto,
    createdBy: string,
  ): Promise<RiderResponseDto> {
    try {
      // Check for existing phone if provided
      if (createDto.phone) {
        const existingPhone = await this.prisma.rider.findUnique({
          where: { phone: createDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      // Check for existing email if provided
      if (createDto.email) {
        const existingEmail = await this.prisma.rider.findUnique({
          where: { email: createDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const rider = await this.prisma.rider.create({
        data: {
          phone: createDto.phone,
          email: createDto.email,
          name: createDto.name,
          licenseNo: createDto.licenseNo,
          vehicleType: createDto.vehicleType,
          shift: createDto.shift,
          metadata: createDto.metadata,
          isActive:
            createDto.isActive !== undefined ? createDto.isActive : true,
        },
      });

      this.logger.log(`Created rider ${rider.uuid} by admin ${createdBy}`);

      return {
        id: rider.id.toString(),
        uuid: rider.uuid,
        phone: rider.phone || undefined,
        email: rider.email || undefined,
        name: rider.name,
        licenseNo: rider.licenseNo || undefined,
        vehicleType: rider.vehicleType || undefined,
        shift: (rider.shift as Record<string, any>) || undefined,
        status: rider.status,
        rating: rider.rating ? Number(rider.rating) : undefined,
        isActive: rider.isActive,
        metadata: (rider.metadata as Record<string, any>) || undefined,
        createdAt: rider.createdAt,
        updatedAt: rider.updatedAt,
        lastActiveAt: rider.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create rider:', error);
      throw error;
    }
  }

  async updateRider(
    id: string,
    updateDto: UpdateRiderDto,
    updatedBy: string,
  ): Promise<RiderResponseDto> {
    try {
      const existingRider = await this.prisma.rider.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
      });

      if (!existingRider) {
        throw new NotFoundException('Rider not found');
      }

      // Check for phone uniqueness if updating phone
      if (updateDto.phone && updateDto.phone !== existingRider.phone) {
        const existingPhone = await this.prisma.rider.findUnique({
          where: { phone: updateDto.phone },
        });
        if (existingPhone) {
          throw new BadRequestException('Phone number already exists');
        }
      }

      // Check for email uniqueness if updating email
      if (updateDto.email && updateDto.email !== existingRider.email) {
        const existingEmail = await this.prisma.rider.findUnique({
          where: { email: updateDto.email },
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      const rider = await this.prisma.rider.update({
        where: { uuid: id },
        data: {
          phone: updateDto.phone,
          email: updateDto.email,
          name: updateDto.name,
          licenseNo: updateDto.licenseNo,
          vehicleType: updateDto.vehicleType,
          shift: updateDto.shift,
          status: updateDto.status,
          isActive: updateDto.isActive,
          metadata: updateDto.metadata,
        },
      });

      this.logger.log(`Updated rider ${id} by admin ${updatedBy}`);

      return {
        id: rider.id.toString(),
        uuid: rider.uuid,
        phone: rider.phone || undefined,
        email: rider.email || undefined,
        name: rider.name,
        licenseNo: rider.licenseNo || undefined,
        vehicleType: rider.vehicleType || undefined,
        shift: (rider.shift as Record<string, any>) || undefined,
        status: rider.status,
        rating: rider.rating ? Number(rider.rating) : undefined,
        isActive: rider.isActive,
        metadata: (rider.metadata as Record<string, any>) || undefined,
        createdAt: rider.createdAt,
        updatedAt: rider.updatedAt,
        lastActiveAt: rider.lastActiveAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to update rider ${id}:`, error);
      throw error;
    }
  }

  async deleteRider(
    id: string,
    deletedBy: string,
  ): Promise<{ message: string }> {
    try {
      const existingRider = await this.prisma.rider.findUnique({
        where: {
          uuid: id,
          isDeleted: false,
        },
      });

      if (!existingRider) {
        throw new NotFoundException('Rider not found');
      }

      await this.prisma.rider.update({
        where: { uuid: id },
        data: { isDeleted: true },
      });

      this.logger.log(`Soft deleted rider ${id} by admin ${deletedBy}`);

      return { message: 'Rider deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete rider ${id}:`, error);
      throw error;
    }
  }
}
