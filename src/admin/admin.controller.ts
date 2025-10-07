import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminCurrentUser } from './decorators/admin-current-user.decorator';
import { AuditService } from './audit.service';
import { UserRole } from '../common/interfaces/user.interface';
import {
  AdminService,
  AdminDashboardStats,
  UserManagementDto,
  VendorApprovalDto,
} from './admin.service';
import {
  AdminPaginationQueryDto,
  AdminUserListResponseDto,
  AdminPaginatedResponseDto,
  AdminTransactionListQueryDto,
} from '../common/dto/admin.dto';
import {
  LedgerSummaryResponseDto,
  LedgerEntryResponseDto,
  PayoutResponseDto,
} from '../common/dto/ledger.dto';
import { ProductModerationService } from '../product/product-moderation.service';
import {
  ProductModerationDto,
  ApproveProductDto,
  RejectProductDto,
  BulkModerationDto,
  ProductModerationStatsDto,
  ProductModerationListQueryDto,
} from '../common/dto/product-moderation.dto';
import { RefundService } from '../refund/refund.service';
import { DisputeService } from '../dispute/dispute.service';
import { EscalationService } from '../escalation/escalation.service';
import { OrderService } from '../order/order.service';
import {
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
  RefundResponseDto,
  RefundListQueryDto,
} from '../common/dto/refund.dto';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  UpdateDisputeStatusDto,
  DisputeResponseDto,
  DisputeListQueryDto,
} from '../common/dto/dispute.dto';
import {
  CreateEscalationDto,
  ResolveEscalationDto,
  UpdateEscalationStatusDto,
  EscalationResponseDto,
  EscalationListQueryDto,
} from '../common/dto/escalation.dto';
import {
  ComplaintResponseDto,
  ComplaintListQueryDto,
} from '../common/dto/complaint.dto';
import {
  ProductResponseDto,
  ProductSearchDto,
} from '../common/dto/product.dto';
import {
  AdminUpdateOrderStatusDto,
  AdminOrderQueryDto,
  AdminOrderResponseDto,
} from '../common/dto/order-management.dto';

@Controller('admin')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'finance_admin', 'support_admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
    private readonly productModerationService: ProductModerationService,
    private readonly refundService: RefundService,
    private readonly disputeService: DisputeService,
    private readonly escalationService: EscalationService,
    private readonly orderService: OrderService,
  ) {}

  @Get('profile')
  async getProfile(@AdminCurrentUser() user: any): Promise<any> {
    this.logger.log(`Admin ${user.id} accessing profile`);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleLevel: user.roleLevel,
      permissions: user.permissions,
      lastActiveAt: new Date(),
    };
  }

  @Get('dashboard')
  async getDashboardStats(
    @AdminCurrentUser() user: any,
  ): Promise<AdminDashboardStats> {
    this.logger.log(`Admin ${user.id} accessing dashboard stats`);
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getAllUsers(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving users with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getAllUsers(query);
  }

  @Get('customers')
  async getAllCustomers(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving customers with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getAllCustomers(query);
  }

  @Get('vendors')
  async getAllVendors(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving vendors with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getAllVendors(query);
  }

  @Get('riders')
  async getAllRiders(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminUserListResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving riders with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getAllRiders(query);
  }

  @Put('users/:userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() updateDto: { isActive: boolean },
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} updating user ${userId} status to ${updateDto.isActive}`,
    );

    const result = await this.adminService.updateUserStatus(
      userId,
      updateDto.isActive,
    );

    await this.auditUserStatusUpdate(user.id, userId, updateDto.isActive);

    return result;
  }

  private async auditUserStatusUpdate(
    adminId: string,
    userId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.auditService.logAction({
      adminId: BigInt(adminId),
      action: 'user_status_updated',
      resourceType: 'user',
      resourceId: userId,
      newValues: { isActive },
      metadata: { reason: 'Admin action' },
    });
  }

  @Get('vendors/pending-approvals')
  async getPendingVendorApprovals(
    @AdminCurrentUser() user: any,
  ): Promise<VendorApprovalDto[]> {
    this.logger.log(`Admin ${user.id} retrieving pending vendor approvals`);
    return this.adminService.getPendingVendorApprovals();
  }

  @Put('vendors/:vendorId/approve')
  async approveVendor(
    @Param('vendorId') vendorId: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} approving vendor ${vendorId}`);
    return this.adminService.approveVendor(vendorId);
  }

  @Put('vendors/:vendorId/reject')
  async rejectVendor(
    @Param('vendorId') vendorId: string,
    @Body() rejectDto: { reason: string },
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} rejecting vendor ${vendorId} with reason: ${rejectDto.reason}`,
    );
    return this.adminService.rejectVendor(vendorId, rejectDto.reason);
  }

  @Get('monthly-payment-monitoring')
  async getMonthlyPaymentMonitoring(
    @AdminCurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<LedgerSummaryResponseDto[]> {
    this.logger.log(
      `Admin ${user.id} accessing monthly payment monitoring for ${month}/${year}`,
    );
    return this.adminService.getMonthlyPaymentMonitoring(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post('reports/pending-dues')
  async exportPendingDuesReport(
    @Body() reportDto: { month: number; year: number },
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string; reportUrl: string }> {
    this.logger.log(
      `Admin ${user.id} generating pending dues report for ${reportDto.month}/${reportDto.year}`,
    );
    return this.adminService.exportPendingDuesReport(
      reportDto.month,
      reportDto.year,
    );
  }

  // Product Moderation Endpoints
  @Get('products/moderation')
  async getProductsForModeration(
    @AdminCurrentUser() user: any,
    @Query() query: ProductModerationListQueryDto,
  ): Promise<{ products: ProductModerationDto[]; total: number }> {
    this.logger.log(
      `Admin ${user.id} retrieving products for moderation with filters: ${JSON.stringify(query)}`,
    );
    return this.productModerationService.getProductsForModeration(query);
  }

  @Get('products/moderation/stats')
  async getModerationStats(
    @AdminCurrentUser() user: any,
  ): Promise<ProductModerationStatsDto> {
    this.logger.log(`Admin ${user.id} retrieving moderation statistics`);
    return this.productModerationService.getModerationStats();
  }

  @Put('products/:productId/approve')
  async approveProduct(
    @Param('productId') productId: string,
    @Body() dto: ApproveProductDto,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} approving product ${productId}`);
    return this.productModerationService.approveProduct(
      productId,
      user.id,
      dto,
    );
  }

  @Put('products/:productId/reject')
  async rejectProduct(
    @Param('productId') productId: string,
    @Body() dto: RejectProductDto,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} rejecting product ${productId} with reason: ${dto.reason}`,
    );
    return this.productModerationService.rejectProduct(productId, user.id, dto);
  }

  @Post('products/bulk-moderate')
  async bulkModerateProducts(
    @Body() dto: BulkModerationDto,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string; processed: number }> {
    this.logger.log(
      `Admin ${user.id} performing bulk ${dto.action} on ${dto.productIds.length} products`,
    );
    return this.productModerationService.bulkModerateProducts(user.id, dto);
  }

  // Order Management Endpoints
  @Get('orders')
  async getOrders(
    @AdminCurrentUser() user: any,
    @Query() query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving orders with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getOrders(query);
  }

  @Get('orders/pending')
  async getPendingOrders(
    @AdminCurrentUser() user: any,
    @Query() query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving pending orders with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getPendingOrders(query);
  }

  @Get('orders/completed')
  async getCompletedOrders(
    @AdminCurrentUser() user: any,
    @Query() query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving completed orders with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getCompletedOrders(query);
  }

  @Get('orders/cancelled')
  async getCancelledOrders(
    @AdminCurrentUser() user: any,
    @Query() query: AdminOrderQueryDto,
  ): Promise<AdminPaginatedResponseDto<AdminOrderResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving cancelled orders with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getCancelledOrders(query);
  }

  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: AdminUpdateOrderStatusDto,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} updating order ${orderId} status to ${dto.status}`,
    );
    // TODO: Implement admin order status update
    return { message: 'Order status updated successfully' };
  }

  // Financial Management Endpoints
  @Get('transactions')
  async getTransactions(
    @AdminCurrentUser() user: any,
    @Query() query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<LedgerEntryResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving transactions with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getTransactions(query);
  }

  @Get('payouts')
  async getPayouts(
    @AdminCurrentUser() user: any,
    @Query() query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<PayoutResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving payouts with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getPayouts(query);
  }

  @Get('commissions')
  async getCommissions(
    @AdminCurrentUser() user: any,
    @Query() query: AdminTransactionListQueryDto,
  ): Promise<AdminPaginatedResponseDto<LedgerEntryResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving commissions with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getCommissions(query);
  }

  // Refund Management Endpoints
  @Post('refunds')
  async createRefund(
    @Body() dto: CreateRefundDto,
    @AdminCurrentUser() user: any,
  ): Promise<RefundResponseDto> {
    this.logger.log(
      `Admin ${user.id} creating refund for order ${dto.orderId}`,
    );
    return this.refundService.createRefund(dto.orderId, dto, BigInt(user.id));
  }

  @Get('refunds')
  async getRefunds(
    @AdminCurrentUser() user: any,
    @Query() query: RefundListQueryDto,
  ): Promise<{ refunds: RefundResponseDto[]; total: number }> {
    this.logger.log(`Admin ${user.id} retrieving refunds`);
    return this.refundService.getRefunds(query);
  }

  @Put('refunds/:refundId/approve')
  async approveRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto,
    @AdminCurrentUser() user: any,
  ): Promise<RefundResponseDto> {
    this.logger.log(`Admin ${user.id} approving refund ${refundId}`);
    return this.refundService.approveRefund(
      BigInt(refundId),
      dto,
      BigInt(user.id),
    );
  }

  @Put('refunds/:refundId/reject')
  async rejectRefund(
    @Param('refundId') refundId: string,
    @Body() dto: RejectRefundDto,
    @AdminCurrentUser() user: any,
  ): Promise<RefundResponseDto> {
    this.logger.log(`Admin ${user.id} rejecting refund ${refundId}`);
    return this.refundService.rejectRefund(
      BigInt(refundId),
      dto,
      BigInt(user.id),
    );
  }

  @Put('refunds/:refundId/process')
  async processRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ProcessRefundDto,
    @AdminCurrentUser() user: any,
  ): Promise<RefundResponseDto> {
    this.logger.log(`Admin ${user.id} processing refund ${refundId}`);
    return this.refundService.processRefund(
      BigInt(refundId),
      dto,
      BigInt(user.id),
    );
  }

  // Dispute Management Endpoints
  @Post('disputes')
  async createDispute(
    @Body() dto: CreateDisputeDto,
    @AdminCurrentUser() user: any,
  ): Promise<DisputeResponseDto> {
    this.logger.log(
      `Admin ${user.id} creating dispute for order ${dto.orderId}`,
    );
    return this.disputeService.createDispute(
      dto.orderId,
      BigInt(user.id),
      'admin',
      dto,
    );
  }

  @Get('disputes')
  async getDisputes(
    @AdminCurrentUser() user: any,
    @Query() query: DisputeListQueryDto,
  ): Promise<{ disputes: DisputeResponseDto[]; total: number }> {
    this.logger.log(`Admin ${user.id} retrieving disputes`);
    return this.disputeService.getDisputes(query);
  }

  @Put('disputes/:disputeId/resolve')
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDisputeDto,
    @AdminCurrentUser() user: any,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`Admin ${user.id} resolving dispute ${disputeId}`);
    return this.disputeService.resolveDispute(
      BigInt(disputeId),
      dto,
      BigInt(user.id),
    );
  }

  @Put('disputes/:disputeId/status')
  async updateDisputeStatus(
    @Param('disputeId') disputeId: string,
    @Body() dto: UpdateDisputeStatusDto,
    @AdminCurrentUser() user: any,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`Admin ${user.id} updating dispute ${disputeId} status`);
    return this.disputeService.updateDisputeStatus(
      BigInt(disputeId),
      dto,
      BigInt(user.id),
    );
  }

  @Post('disputes/:disputeId/escalate')
  async escalateDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: CreateEscalationDto,
    @AdminCurrentUser() user: any,
  ): Promise<DisputeResponseDto> {
    this.logger.log(`Admin ${user.id} escalating dispute ${disputeId}`);
    return this.disputeService.escalateDispute(
      BigInt(disputeId),
      BigInt(user.id),
      dto.escalatedTo,
      dto.reason,
    );
  }

  // Complaint Management Endpoints
  @Get('complaints')
  async getComplaints(
    @AdminCurrentUser() user: any,
    @Query() query: ComplaintListQueryDto,
  ): Promise<AdminPaginatedResponseDto<ComplaintResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving complaints with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getComplaints(query);
  }

  // Content Management Endpoints
  @Get('products')
  async getProducts(
    @AdminCurrentUser() user: any,
    @Query() query: ProductSearchDto,
  ): Promise<AdminPaginatedResponseDto<ProductResponseDto>> {
    this.logger.log(
      `Admin ${user.id} retrieving products with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getProducts(query);
  }

  @Get('reviews')
  async getReviews(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<any>> {
    this.logger.log(
      `Admin ${user.id} retrieving reviews with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getReviews(query);
  }

  @Get('reports')
  async getReports(
    @AdminCurrentUser() user: any,
    @Query() query: AdminPaginationQueryDto,
  ): Promise<AdminPaginatedResponseDto<any>> {
    this.logger.log(
      `Admin ${user.id} retrieving reports with filters: ${JSON.stringify(query)}`,
    );
    return this.adminService.getReports(query);
  }

  // Escalation Management Endpoints
  @Get('escalations')
  async getEscalations(
    @AdminCurrentUser() user: any,
    @Query() query: EscalationListQueryDto,
  ): Promise<{ escalations: EscalationResponseDto[]; total: number }> {
    this.logger.log(`Admin ${user.id} retrieving escalations`);
    return this.escalationService.getEscalations(query);
  }

  @Put('escalations/:escalationId/resolve')
  async resolveEscalation(
    @Param('escalationId') escalationId: string,
    @Body() dto: ResolveEscalationDto,
    @AdminCurrentUser() user: any,
  ): Promise<EscalationResponseDto> {
    this.logger.log(`Admin ${user.id} resolving escalation ${escalationId}`);
    return this.escalationService.resolveEscalation(
      BigInt(escalationId),
      dto,
      BigInt(user.id),
    );
  }

  @Put('escalations/:escalationId/status')
  async updateEscalationStatus(
    @Param('escalationId') escalationId: string,
    @Body() dto: UpdateEscalationStatusDto,
    @AdminCurrentUser() user: any,
  ): Promise<EscalationResponseDto> {
    this.logger.log(
      `Admin ${user.id} updating escalation ${escalationId} status`,
    );
    return this.escalationService.updateEscalationStatus(
      BigInt(escalationId),
      dto,
      BigInt(user.id),
    );
  }
}
