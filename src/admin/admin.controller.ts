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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/interfaces/user.interface';
import { User } from '../common/interfaces/user.interface';
import {
  AdminService,
  AdminDashboardStats,
  UserManagementDto,
  VendorApprovalDto,
} from './admin.service';
import { MonthlyBillingSummaryDto } from '../common/dto/monthly-ledger.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardStats(
    @CurrentUser() user: User,
  ): Promise<AdminDashboardStats> {
    this.logger.log(`Admin ${user.id} accessing dashboard stats`);
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getAllUsers(
    @CurrentUser() user: User,
    @Query('role') role?: UserRole,
    @Query('status') status?: 'active' | 'inactive',
  ): Promise<UserManagementDto[]> {
    this.logger.log(
      `Admin ${user.id} retrieving users with filters: role=${role}, status=${status}`,
    );
    return this.adminService.getAllUsers(role, status);
  }

  @Put('users/:userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() updateDto: { isActive: boolean },
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} updating user ${userId} status to ${updateDto.isActive}`,
    );
    return this.adminService.updateUserStatus(userId, updateDto.isActive);
  }

  @Get('vendors/pending-approvals')
  async getPendingVendorApprovals(
    @CurrentUser() user: User,
  ): Promise<VendorApprovalDto[]> {
    this.logger.log(`Admin ${user.id} retrieving pending vendor approvals`);
    return this.adminService.getPendingVendorApprovals();
  }

  @Put('vendors/:vendorId/approve')
  async approveVendor(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(`Admin ${user.id} approving vendor ${vendorId}`);
    return this.adminService.approveVendor(vendorId);
  }

  @Put('vendors/:vendorId/reject')
  async rejectVendor(
    @Param('vendorId') vendorId: string,
    @Body() rejectDto: { reason: string },
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Admin ${user.id} rejecting vendor ${vendorId} with reason: ${rejectDto.reason}`,
    );
    return this.adminService.rejectVendor(vendorId, rejectDto.reason);
  }

  @Get('monthly-payment-monitoring')
  async getMonthlyPaymentMonitoring(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<MonthlyBillingSummaryDto[]> {
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
    @CurrentUser() user: User,
  ): Promise<{ message: string; reportUrl: string }> {
    this.logger.log(
      `Admin ${user.id} generating pending dues report for ${reportDto.month}/${reportDto.year}`,
    );
    return this.adminService.exportPendingDuesReport(
      reportDto.month,
      reportDto.year,
    );
  }
}
