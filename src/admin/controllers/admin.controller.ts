import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin-roles.decorator';
import { AdminCurrentUser } from '../decorators/admin-current-user.decorator';
import { AuditService } from '../services/audit.service';
import {
  AdminService,
  AdminDashboardStats,
  VendorApprovalDto,
} from '../services/admin.service';
import {
  AdminPaginationQueryDto,
  AdminUserListResponseDto,
  AdminPaginatedResponseDto,
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
  LedgerSummaryResponseDto,
  LedgerEntryResponseDto,
  PayoutResponseDto,
} from '../../ledger/dto/ledger.dto';
import { ProductModerationService } from '../../product/services/product-moderation.service';
import {
  ProductModerationDto,
  ApproveProductDto,
  RejectProductDto,
  BulkModerationDto,
  ProductModerationStatsDto,
  ProductModerationListQueryDto,
} from '../../product/dto/product-moderation.dto';
import { RefundService } from '../../refund/services/refund.service';
import {
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
  RefundResponseDto,
  RefundListQueryDto,
} from '../../refund/dto/refund.dto';
import {
  ComplaintResponseDto,
  ComplaintListQueryDto,
} from '../../complaint/dto/complaint.dto';
import {
  ProductResponseDto,
} from '../../product/dto/product.dto';
import {
  AdminUpdateOrderStatusDto,
  AdminOrderQueryDto,
  AdminOrderResponseDto,
} from '../dto/order-management.dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../common/dto/customer.dto';

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

  // Admin CRUD Endpoints
  @Get('admins/:id')
  async getAdminById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving admin ${id}`);
    return this.adminService.getAdminById(id);
  }

  @Post('admins')
  @AdminRoles('super_admin')
  async createAdmin(
    @Body() createDto: CreateAdminDto,
    @AdminCurrentUser() user: any,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Admin ${user.id} creating new admin`);

    const admin = await this.adminService.createAdmin(createDto, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'admin_created',
      resourceType: 'admin',
      resourceId: admin.id,
      newValues: {
        email: admin.email,
        name: admin.name,
        roleLevel: admin.roleLevel,
      },
      metadata: { createdBy: user.id },
    });

    return admin;
  }

  @Put('admins/:id')
  @AdminRoles('super_admin')
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateAdminDto,
    @AdminCurrentUser() user: any,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Admin ${user.id} updating admin ${id}`);

    const oldAdmin = await this.adminService.getAdminById(id);
    const updatedAdmin = await this.adminService.updateAdmin(
      id,
      updateDto,
      user.id,
    );

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'admin_updated',
      resourceType: 'admin',
      resourceId: id,
      oldValues: oldAdmin,
      newValues: updatedAdmin,
      metadata: { updatedBy: user.id },
    });

    return updatedAdmin;
  }

  @Delete('admins/:id')
  @AdminRoles('super_admin')
  async deleteAdmin(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting admin ${id}`);

    const result = await this.adminService.deleteAdmin(id, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'admin_deleted',
      resourceType: 'admin',
      resourceId: id,
      metadata: { deletedBy: user.id },
    });

    return result;
  }

  @Get('dashboard')
  async getDashboardStats(
    @AdminCurrentUser() user: any,
  ): Promise<AdminDashboardStats> {
    this.logger.log(`Admin ${user.id} accessing dashboard stats`);
    return this.adminService.getDashboardStats();
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

  @Get('customers/:id')
  async getCustomerById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<AdminUserListResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving customer ${id}`);
    return this.adminService.getCustomerById(id);
  }

  @Post('customers')
  @AdminRoles('super_admin', 'support_admin')
  async createCustomer(
    @Body() createDto: CreateCustomerDto,
    @AdminCurrentUser() user: any,
  ): Promise<AdminUserListResponseDto> {
    this.logger.log(`Admin ${user.id} creating new customer`);

    const customer = await this.adminService.createCustomer(createDto, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'customer_created',
      resourceType: 'customer',
      resourceId: customer.id,
      newValues: {
        phone: customer.phone,
        name: customer.name,
        email: customer.phone,
        isActive: customer.isActive,
      },
      metadata: { createdBy: user.id },
    });

    return customer;
  }

  @Put('customers/:id')
  @AdminRoles('super_admin', 'support_admin')
  async updateCustomer(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
    @AdminCurrentUser() user: any,
  ): Promise<AdminUserListResponseDto> {
    this.logger.log(`Admin ${user.id} updating customer ${id}`);

    const oldCustomer = await this.adminService.getCustomerById(id);
    const updatedCustomer = await this.adminService.updateCustomer(
      id,
      updateDto,
      user.id,
    );

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'customer_updated',
      resourceType: 'customer',
      resourceId: id,
      oldValues: oldCustomer,
      newValues: updatedCustomer,
      metadata: { updatedBy: user.id },
    });

    return updatedCustomer;
  }

  @Delete('customers/:id')
  @AdminRoles('super_admin')
  async deleteCustomer(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting customer ${id}`);

    const result = await this.adminService.deleteCustomer(id, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'customer_deleted',
      resourceType: 'customer',
      resourceId: id,
      metadata: { deletedBy: user.id },
    });

    return result;
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

  @Get('vendors/:id')
  async getVendorById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<VendorResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving vendor ${id}`);
    return this.adminService.getVendorById(id);
  }

  @Post('vendors')
  @AdminRoles('super_admin', 'support_admin')
  async createVendor(
    @Body() createDto: CreateVendorDto,
    @AdminCurrentUser() user: any,
  ): Promise<VendorResponseDto> {
    this.logger.log(`Admin ${user.id} creating new vendor`);

    const vendor = await this.adminService.createVendor(createDto, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'vendor_created',
      resourceType: 'vendor',
      resourceId: vendor.id,
      newValues: {
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        gstin: vendor.gstin,
        isActive: vendor.isActive,
      },
      metadata: { createdBy: user.id },
    });

    return vendor;
  }

  @Put('vendors/:id')
  @AdminRoles('super_admin', 'support_admin')
  async updateVendor(
    @Param('id') id: string,
    @Body() updateDto: UpdateVendorDto,
    @AdminCurrentUser() user: any,
  ): Promise<VendorResponseDto> {
    this.logger.log(`Admin ${user.id} updating vendor ${id}`);

    const oldVendor = await this.adminService.getVendorById(id);
    const updatedVendor = await this.adminService.updateVendor(
      id,
      updateDto,
      user.id,
    );

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'vendor_updated',
      resourceType: 'vendor',
      resourceId: id,
      oldValues: oldVendor,
      newValues: updatedVendor,
      metadata: { updatedBy: user.id },
    });

    return updatedVendor;
  }

  @Delete('vendors/:id')
  @AdminRoles('super_admin')
  async deleteVendor(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting vendor ${id}`);

    const result = await this.adminService.deleteVendor(id, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'vendor_deleted',
      resourceType: 'vendor',
      resourceId: id,
      metadata: { deletedBy: user.id },
    });

    return result;
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

  @Get('riders/:id')
  async getRiderById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<RiderResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving rider ${id}`);
    return this.adminService.getRiderById(id);
  }

  @Post('riders')
  @AdminRoles('super_admin', 'support_admin')
  async createRider(
    @Body() createDto: CreateRiderDto,
    @AdminCurrentUser() user: any,
  ): Promise<RiderResponseDto> {
    this.logger.log(`Admin ${user.id} creating new rider`);

    const rider = await this.adminService.createRider(createDto, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'rider_created',
      resourceType: 'rider',
      resourceId: rider.uuid,
      newValues: {
        name: rider.name,
        phone: rider.phone,
        email: rider.email,
        licenseNo: rider.licenseNo,
        vehicleType: rider.vehicleType,
        isActive: rider.isActive,
      },
      metadata: { createdBy: user.id },
    });

    return rider;
  }

  @Put('riders/:id')
  @AdminRoles('super_admin', 'support_admin')
  async updateRider(
    @Param('id') id: string,
    @Body() updateDto: UpdateRiderDto,
    @AdminCurrentUser() user: any,
  ): Promise<RiderResponseDto> {
    this.logger.log(`Admin ${user.id} updating rider ${id}`);

    const oldRider = await this.adminService.getRiderById(id);
    const updatedRider = await this.adminService.updateRider(
      id,
      updateDto,
      user.id,
    );

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'rider_updated',
      resourceType: 'rider',
      resourceId: id,
      oldValues: oldRider,
      newValues: updatedRider,
      metadata: { updatedBy: user.id },
    });

    return updatedRider;
  }

  @Delete('riders/:id')
  @AdminRoles('super_admin')
  async deleteRider(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} deleting rider ${id}`);

    const result = await this.adminService.deleteRider(id, user.id);

    await this.auditService.logAction({
      adminId: BigInt(user.id),
      action: 'rider_deleted',
      resourceType: 'rider',
      resourceId: id,
      metadata: { deletedBy: user.id },
    });

    return result;
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
    return this.refundService.createRefund(dto, BigInt(user.id));
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
    @Query() query: any,
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
}
