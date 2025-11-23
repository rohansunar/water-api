import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { VendorService } from '../services/vendor.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentVendor } from '../../product/decorators/current-vendor.decorator';
import { User, UserRole } from '../../common/interfaces/user.interface';
import {
  SalesAnalyticsDto,
  SalesAnalyticsResponseDto,
  ProductPerformanceDto,
  CustomerInsightsDto,
  DailyReportDto,
  MonthlyReportDto,
  InventoryStatusDto,
  UpdateInventoryDto,
  InventoryAdjustmentDto,
  LowStockAlertDto,
  PaginationQueryDto,
  PaginatedResponseDto,
} from '../dto/vendor.dto';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorController {
  private readonly logger = new Logger(VendorController.name);

  constructor(private readonly vendorService: VendorService) {}

  // Analytics & Reports Endpoints
  @Get('analytics/sales')
  async getSalesAnalytics(
    @CurrentVendor() vendor: User,
    @Query() analyticsQuery: SalesAnalyticsDto,
  ): Promise<SalesAnalyticsResponseDto> {
    this.logger.log(`Getting sales analytics for vendor user: ${vendor.id}`);
    return this.vendorService.getSalesAnalytics(vendor.id, analyticsQuery);
  }

  @Get('analytics/products')
  async getProductPerformance(
    @CurrentVendor() vendor: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductPerformanceDto>> {
    this.logger.log(
      `Getting product performance for vendor user: ${vendor.id}`,
    );
    return this.vendorService.getProductPerformance(vendor.id, paginationQuery);
  }

  @Get('analytics/customers')
  async getCustomerInsights(
    @CurrentVendor() vendor: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CustomerInsightsDto>> {
    this.logger.log(`Getting customer insights for vendor user: ${vendor.id}`);
    return this.vendorService.getCustomerInsights(vendor.id, paginationQuery);
  }

  @Get('reports/daily')
  async getDailyReport(
    @CurrentVendor() vendor: User,
    @Query('date') date?: string,
  ): Promise<DailyReportDto> {
    this.logger.log(`Getting daily report for vendor user: ${vendor.id}`);
    return this.vendorService.getDailyReport(vendor.id, date);
  }

  @Get('reports/monthly')
  async getMonthlyReport(
    @CurrentVendor() vendor: User,
    @Query('month') month?: string,
  ): Promise<MonthlyReportDto> {
    this.logger.log(`Getting monthly report for vendor user: ${vendor.id}`);
    return this.vendorService.getMonthlyReport(vendor.id, month);
  }

  // Inventory Management Endpoints
  @Get('inventory')
  async getInventoryStatus(
    @CurrentVendor() vendor: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<InventoryStatusDto>> {
    this.logger.log(`Getting inventory status for vendor user: ${vendor.id}`);
    return this.vendorService.getInventoryStatus(vendor.id, paginationQuery);
  }

  @Put('inventory/:productId')
  async updateInventory(
    @Param('productId') productId: string,
    @CurrentVendor() vendor: User,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryStatusDto> {
    this.logger.log(
      `Updating inventory for product ${productId} by vendor user: ${vendor.id}`,
    );
    return this.vendorService.updateInventory(
      productId,
      vendor.id,
      updateInventoryDto,
    );
  }

  @Post('inventory/adjustment')
  async adjustInventory(
    @CurrentVendor() vendor: User,
    @Body() adjustmentDto: InventoryAdjustmentDto,
  ): Promise<{ message: string; newStock: number }> {
    this.logger.log(`Adjusting inventory for vendor user: ${vendor.id}`);
    return this.vendorService.adjustInventory(vendor.id, adjustmentDto);
  }

  @Get('inventory/alerts')
  async getLowStockAlerts(
    @CurrentVendor() vendor: User,
  ): Promise<LowStockAlertDto[]> {
    this.logger.log(`Getting low stock alerts for vendor user: ${vendor.id}`);
    return this.vendorService.getLowStockAlerts(vendor.id);
  }
}
