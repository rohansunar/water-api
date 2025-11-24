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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
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
import { ProductResponseDto } from '../../product/dto/product.dto';
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
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
    private readonly productModerationService: ProductModerationService,
    private readonly refundService: RefundService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get admin profile', description: 'Retrieve the current admin user profile information' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get admin by ID', description: 'Retrieve a specific admin user by their ID' })
  @ApiParam({ name: 'id', description: 'Admin ID', type: String })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully', type: AdminResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAdminById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<AdminResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving admin ${id}`);
    return this.adminService.getAdminById(id);
  }

  @Post('admins')
  @AdminRoles('super_admin')
  @ApiOperation({ summary: 'Create admin', description: 'Create a new admin user' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ status: 201, description: 'Admin created successfully', type: AdminResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Update admin', description: 'Update an existing admin user' })
  @ApiParam({ name: 'id', description: 'Admin ID', type: String })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({ status: 200, description: 'Admin updated successfully', type: AdminResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Delete admin', description: 'Delete an admin user' })
  @ApiParam({ name: 'id', description: 'Admin ID', type: String })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get dashboard stats', description: 'Retrieve admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully', type: Object })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDashboardStats(
    @AdminCurrentUser() user: any,
  ): Promise<AdminDashboardStats> {
    this.logger.log(`Admin ${user.id} accessing dashboard stats`);
    return this.adminService.getDashboardStats();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers', description: 'Retrieve a paginated list of all customers' })
  @ApiQuery({ type: AdminPaginationQueryDto })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get customer by ID', description: 'Retrieve a specific customer by their ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: String })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully', type: AdminUserListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getCustomerById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<AdminUserListResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving customer ${id}`);
    return this.adminService.getCustomerById(id);
  }

  @Post('customers')
  @AdminRoles('super_admin', 'support_admin')
  @ApiOperation({ summary: 'Create customer', description: 'Create a new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer created successfully', type: AdminUserListResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Update customer', description: 'Update an existing customer' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: String })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Customer updated successfully', type: AdminUserListResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Delete customer', description: 'Delete a customer' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: String })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get all vendors', description: 'Retrieve a paginated list of all vendors' })
  @ApiQuery({ type: AdminPaginationQueryDto })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get vendor by ID', description: 'Retrieve a specific vendor by their ID' })
  @ApiParam({ name: 'id', description: 'Vendor ID', type: String })
  @ApiResponse({ status: 200, description: 'Vendor retrieved successfully', type: VendorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVendorById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<VendorResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving vendor ${id}`);
    return this.adminService.getVendorById(id);
  }

  @Post('vendors')
  @AdminRoles('super_admin', 'support_admin')
  @ApiOperation({ summary: 'Create vendor', description: 'Create a new vendor' })
  @ApiBody({ type: CreateVendorDto })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: VendorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Update vendor', description: 'Update an existing vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID', type: String })
  @ApiBody({ type: UpdateVendorDto })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully', type: VendorResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Delete vendor', description: 'Delete a vendor' })
  @ApiParam({ name: 'id', description: 'Vendor ID', type: String })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get all riders', description: 'Retrieve a paginated list of all riders' })
  @ApiQuery({ type: AdminPaginationQueryDto })
  @ApiResponse({ status: 200, description: 'Riders retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get rider by ID', description: 'Retrieve a specific rider by their ID' })
  @ApiParam({ name: 'id', description: 'Rider ID', type: String })
  @ApiResponse({ status: 200, description: 'Rider retrieved successfully', type: RiderResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRiderById(
    @Param('id') id: string,
    @AdminCurrentUser() user: any,
  ): Promise<RiderResponseDto> {
    this.logger.log(`Admin ${user.id} retrieving rider ${id}`);
    return this.adminService.getRiderById(id);
  }

  @Post('riders')
  @AdminRoles('super_admin', 'support_admin')
  @ApiOperation({ summary: 'Create rider', description: 'Create a new rider' })
  @ApiBody({ type: CreateRiderDto })
  @ApiResponse({ status: 201, description: 'Rider created successfully', type: RiderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Update rider', description: 'Update an existing rider' })
  @ApiParam({ name: 'id', description: 'Rider ID', type: String })
  @ApiBody({ type: UpdateRiderDto })
  @ApiResponse({ status: 200, description: 'Rider updated successfully', type: RiderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Delete rider', description: 'Delete a rider' })
  @ApiParam({ name: 'id', description: 'Rider ID', type: String })
  @ApiResponse({ status: 200, description: 'Rider deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rider not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get pending vendor approvals', description: 'Retrieve list of vendors pending approval' })
  @ApiResponse({ status: 200, description: 'Pending approvals retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPendingVendorApprovals(
    @AdminCurrentUser() user: any,
  ): Promise<VendorApprovalDto[]> {
    this.logger.log(`Admin ${user.id} retrieving pending vendor approvals`);
    return this.adminService.getPendingVendorApprovals();
  }

  @Put('vendors/:vendorId/approve')
  @ApiOperation({ summary: 'Approve vendor', description: 'Approve a pending vendor' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', type: String })
  @ApiResponse({ status: 200, description: 'Vendor approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async approveVendor(
    @Param('vendorId') vendorId: string,
    @AdminCurrentUser() user: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} approving vendor ${vendorId}`);
    return this.adminService.approveVendor(vendorId);
  }

  @Put('vendors/:vendorId/reject')
  @ApiOperation({ summary: 'Reject vendor', description: 'Reject a pending vendor with reason' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', type: String })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Vendor rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get monthly payment monitoring', description: 'Retrieve monthly payment monitoring data' })
  @ApiQuery({ name: 'month', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payment monitoring data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Export pending dues report', description: 'Generate and export pending dues report' })
  @ApiBody({ schema: { type: 'object', properties: { month: { type: 'number' }, year: { type: 'number' } } } })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get products for moderation', description: 'Retrieve products pending moderation' })
  @ApiQuery({ type: ProductModerationListQueryDto })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get moderation stats', description: 'Retrieve product moderation statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully', type: ProductModerationStatsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getModerationStats(
    @AdminCurrentUser() user: any,
  ): Promise<ProductModerationStatsDto> {
    this.logger.log(`Admin ${user.id} retrieving moderation statistics`);
    return this.productModerationService.getModerationStats();
  }

  @Put('products/:productId/approve')
  @ApiOperation({ summary: 'Approve product', description: 'Approve a product for moderation' })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiBody({ type: ApproveProductDto })
  @ApiResponse({ status: 200, description: 'Product approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Reject product', description: 'Reject a product for moderation' })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiBody({ type: RejectProductDto })
  @ApiResponse({ status: 200, description: 'Product rejected successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Bulk moderate products', description: 'Perform bulk moderation on multiple products' })
  @ApiBody({ type: BulkModerationDto })
  @ApiResponse({ status: 200, description: 'Bulk moderation completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get orders', description: 'Retrieve a paginated list of orders' })
  @ApiQuery({ type: AdminOrderQueryDto })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get pending orders', description: 'Retrieve a paginated list of pending orders' })
  @ApiQuery({ type: AdminOrderQueryDto })
  @ApiResponse({ status: 200, description: 'Pending orders retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get completed orders', description: 'Retrieve a paginated list of completed orders' })
  @ApiQuery({ type: AdminOrderQueryDto })
  @ApiResponse({ status: 200, description: 'Completed orders retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get cancelled orders', description: 'Retrieve a paginated list of cancelled orders' })
  @ApiQuery({ type: AdminOrderQueryDto })
  @ApiResponse({ status: 200, description: 'Cancelled orders retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Update order status', description: 'Update the status of an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID', type: String })
  @ApiBody({ type: AdminUpdateOrderStatusDto })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get transactions', description: 'Retrieve a paginated list of transactions' })
  @ApiQuery({ type: AdminTransactionListQueryDto })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get payouts', description: 'Retrieve a paginated list of payouts' })
  @ApiQuery({ type: AdminTransactionListQueryDto })
  @ApiResponse({ status: 200, description: 'Payouts retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get commissions', description: 'Retrieve a paginated list of commissions' })
  @ApiQuery({ type: AdminTransactionListQueryDto })
  @ApiResponse({ status: 200, description: 'Commissions retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Create refund', description: 'Create a new refund request' })
  @ApiBody({ type: CreateRefundDto })
  @ApiResponse({ status: 201, description: 'Refund created successfully', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get refunds', description: 'Retrieve a list of refunds' })
  @ApiQuery({ type: RefundListQueryDto })
  @ApiResponse({ status: 200, description: 'Refunds retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRefunds(
    @AdminCurrentUser() user: any,
    @Query() query: RefundListQueryDto,
  ): Promise<{ refunds: RefundResponseDto[]; total: number }> {
    this.logger.log(`Admin ${user.id} retrieving refunds`);
    return this.refundService.getRefunds(query);
  }

  @Put('refunds/:refundId/approve')
  @ApiOperation({ summary: 'Approve refund', description: 'Approve a refund request' })
  @ApiParam({ name: 'refundId', description: 'Refund ID', type: String })
  @ApiBody({ type: ApproveRefundDto })
  @ApiResponse({ status: 200, description: 'Refund approved successfully', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Reject refund', description: 'Reject a refund request' })
  @ApiParam({ name: 'refundId', description: 'Refund ID', type: String })
  @ApiBody({ type: RejectRefundDto })
  @ApiResponse({ status: 200, description: 'Refund rejected successfully', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Process refund', description: 'Process a refund request' })
  @ApiParam({ name: 'refundId', description: 'Refund ID', type: String })
  @ApiBody({ type: ProcessRefundDto })
  @ApiResponse({ status: 200, description: 'Refund processed successfully', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get complaints', description: 'Retrieve a paginated list of complaints' })
  @ApiQuery({ type: ComplaintListQueryDto })
  @ApiResponse({ status: 200, description: 'Complaints retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get products', description: 'Retrieve a paginated list of products' })
  @ApiQuery({ type: Object })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get reviews', description: 'Retrieve a paginated list of reviews' })
  @ApiQuery({ type: AdminPaginationQueryDto })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiOperation({ summary: 'Get reports', description: 'Retrieve a paginated list of reports' })
  @ApiQuery({ type: AdminPaginationQueryDto })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully', type: AdminPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
