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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../common/interfaces/user.interface';
import {
  CreateProductDto,
  ProductResponseDto,
} from '../../product/dto/product.dto';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../order/dto/order.dto';
import {
  UpdateStoreDto,
  StoreResponseDto,
  CreateStoreHoursDto,
  UpdateStoreHoursDto,
  StoreHoursResponseDto,
  UpdateStoreStatusDto,
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
  OrderSummaryDto,
  AcceptOrderDto,
  RejectOrderDto,
  PaginationQueryDto,
  PaginatedResponseDto,
  VendorProductVariantResponseDto,
  UpdateProductVariantDto,
} from '../dto/vendor.dto';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorController {
  private readonly logger = new Logger(VendorController.name);

  constructor(private readonly vendorService: VendorService) {}

  @Get('orders')
  async getVendorOrders(
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for vendor user: ${user.id}`);
    return this.vendorService.getVendorOrders(user.id);
  }

  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Updating order ${orderId} status for vendor user: ${user.id}`,
    );
    return this.vendorService.updateOrderStatus(
      orderId,
      user.id,
      updateOrderStatusDto,
    );
  }

  @Get('products')
  async getVendorProducts(
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto[]> {
    this.logger.log(`Getting products for vendor user: ${user.id}`);
    return this.vendorService.getVendorProducts(user.id);
  }

  @Post('products')
  async createProduct(
    @CurrentUser() user: User,
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Creating product for vendor user: ${user.id}`);
    return this.vendorService.createProduct(user.id, createProductDto);
  }

  @Put('products/:productId/stock')
  async updateProductStock(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
    @Body() updateStockDto: { quantity: number },
  ): Promise<ProductResponseDto> {
    this.logger.log(
      `Updating stock for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.updateProductStock(
      productId,
      user.id,
      updateStockDto.quantity,
    );
  }

  // Store Management Endpoints
  @Get('store')
  async getStoreDetails(@CurrentUser() user: User): Promise<StoreResponseDto> {
    this.logger.log(`Getting store details for vendor user: ${user.id}`);
    return this.vendorService.getStoreDetails(user.id);
  }

  @Put('store')
  async updateStore(
    @CurrentUser() user: User,
    @Body() updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    this.logger.log(`Updating store for vendor user: ${user.id}`);
    return this.vendorService.updateStore(user.id, updateStoreDto);
  }

  @Post('store/hours')
  async createStoreHours(
    @CurrentUser() user: User,
    @Body() createStoreHoursDto: CreateStoreHoursDto,
  ): Promise<StoreHoursResponseDto> {
    this.logger.log(`Creating store hours for vendor user: ${user.id}`);
    return this.vendorService.createStoreHours(user.id, createStoreHoursDto);
  }

  @Put('store/hours/:hoursId')
  async updateStoreHours(
    @Param('hoursId') hoursId: string,
    @CurrentUser() user: User,
    @Body() updateStoreHoursDto: UpdateStoreHoursDto,
  ): Promise<StoreHoursResponseDto> {
    this.logger.log(
      `Updating store hours ${hoursId} for vendor user: ${user.id}`,
    );
    return this.vendorService.updateStoreHours(
      hoursId,
      user.id,
      updateStoreHoursDto,
    );
  }

  @Delete('store/hours/:hoursId')
  async deleteStoreHours(
    @Param('hoursId') hoursId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Deleting store hours ${hoursId} for vendor user: ${user.id}`,
    );
    return this.vendorService.deleteStoreHours(hoursId, user.id);
  }

  @Put('store/status')
  async updateStoreStatus(
    @CurrentUser() user: User,
    @Body() updateStoreStatusDto: UpdateStoreStatusDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Updating store status for vendor user: ${user.id}`);
    return this.vendorService.updateStoreStatus(user.id, updateStoreStatusDto);
  }

  // Product Management Endpoints
  @Get('products/:productId/variants')
  async getProductVariants(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<VendorProductVariantResponseDto>> {
    this.logger.log(
      `Getting product variants for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.getProductVariants(
      productId,
      user.id,
      paginationQuery,
    );
  }

  @Post('products/:productId/variants')
  async createProductVariant(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
    @Body() createVariantDto: any, // TODO: Create proper DTO
  ): Promise<VendorProductVariantResponseDto> {
    this.logger.log(
      `Creating product variant for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.createProductVariant(
      productId,
      user.id,
      createVariantDto,
    );
  }

  @Put('products/:productId/variants/:variantId')
  async updateProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: User,
    @Body() updateVariantDto: UpdateProductVariantDto,
  ): Promise<VendorProductVariantResponseDto> {
    this.logger.log(
      `Updating product variant ${variantId} for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.updateProductVariant(
      productId,
      variantId,
      user.id,
      updateVariantDto,
    );
  }

  @Delete('products/:productId/variants/:variantId')
  async deleteProductVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Deleting product variant ${variantId} for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.deleteProductVariant(
      productId,
      variantId,
      user.id,
    );
  }

  @Get('products/categories')
  async getProductCategories(@CurrentUser() user: User): Promise<string[]> {
    this.logger.log(`Getting product categories for vendor user: ${user.id}`);
    return this.vendorService.getProductCategories(user.id);
  }

  @Post('products/bulk')
  async bulkProductOperations(
    @CurrentUser() user: User,
    @Body() bulkOperationsDto: any, // TODO: Create proper DTO
  ): Promise<{ message: string; processed: number }> {
    this.logger.log(
      `Performing bulk product operations for vendor user: ${user.id}`,
    );
    return this.vendorService.bulkProductOperations(user.id, bulkOperationsDto);
  }

  // Analytics & Reports Endpoints
  @Get('analytics/sales')
  async getSalesAnalytics(
    @CurrentUser() user: User,
    @Query() analyticsQuery: SalesAnalyticsDto,
  ): Promise<SalesAnalyticsResponseDto> {
    this.logger.log(`Getting sales analytics for vendor user: ${user.id}`);
    return this.vendorService.getSalesAnalytics(user.id, analyticsQuery);
  }

  @Get('analytics/products')
  async getProductPerformance(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductPerformanceDto>> {
    this.logger.log(`Getting product performance for vendor user: ${user.id}`);
    return this.vendorService.getProductPerformance(user.id, paginationQuery);
  }

  @Get('analytics/customers')
  async getCustomerInsights(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CustomerInsightsDto>> {
    this.logger.log(`Getting customer insights for vendor user: ${user.id}`);
    return this.vendorService.getCustomerInsights(user.id, paginationQuery);
  }

  @Get('reports/daily')
  async getDailyReport(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ): Promise<DailyReportDto> {
    this.logger.log(`Getting daily report for vendor user: ${user.id}`);
    return this.vendorService.getDailyReport(user.id, date);
  }

  @Get('reports/monthly')
  async getMonthlyReport(
    @CurrentUser() user: User,
    @Query('month') month?: string,
  ): Promise<MonthlyReportDto> {
    this.logger.log(`Getting monthly report for vendor user: ${user.id}`);
    return this.vendorService.getMonthlyReport(user.id, month);
  }

  // Inventory Management Endpoints
  @Get('inventory')
  async getInventoryStatus(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<InventoryStatusDto>> {
    this.logger.log(`Getting inventory status for vendor user: ${user.id}`);
    return this.vendorService.getInventoryStatus(user.id, paginationQuery);
  }

  @Put('inventory/:productId')
  async updateInventory(
    @Param('productId') productId: string,
    @CurrentUser() user: User,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryStatusDto> {
    this.logger.log(
      `Updating inventory for product ${productId} by vendor user: ${user.id}`,
    );
    return this.vendorService.updateInventory(
      productId,
      user.id,
      updateInventoryDto,
    );
  }

  @Post('inventory/adjustment')
  async adjustInventory(
    @CurrentUser() user: User,
    @Body() adjustmentDto: InventoryAdjustmentDto,
  ): Promise<{ message: string; newStock: number }> {
    this.logger.log(`Adjusting inventory for vendor user: ${user.id}`);
    return this.vendorService.adjustInventory(user.id, adjustmentDto);
  }

  @Get('inventory/alerts')
  async getLowStockAlerts(
    @CurrentUser() user: User,
  ): Promise<LowStockAlertDto[]> {
    this.logger.log(`Getting low stock alerts for vendor user: ${user.id}`);
    return this.vendorService.getLowStockAlerts(user.id);
  }

  // Order Management Endpoints
  @Get('orders/pending')
  async getPendingOrders(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    this.logger.log(`Getting pending orders for vendor user: ${user.id}`);
    return this.vendorService.getPendingOrders(user.id, paginationQuery);
  }

  @Get('orders/completed')
  async getCompletedOrders(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    this.logger.log(`Getting completed orders for vendor user: ${user.id}`);
    return this.vendorService.getCompletedOrders(user.id, paginationQuery);
  }

  @Get('orders/cancelled')
  async getCancelledOrders(
    @CurrentUser() user: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    this.logger.log(`Getting cancelled orders for vendor user: ${user.id}`);
    return this.vendorService.getCancelledOrders(user.id, paginationQuery);
  }

  @Post('orders/:orderId/accept')
  async acceptOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    this.logger.log(`Accepting order ${orderId} for vendor user: ${user.id}`);
    return this.vendorService.acceptOrder(orderId, user.id, acceptOrderDto);
  }

  @Post('orders/:orderId/reject')
  async rejectOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Rejecting order ${orderId} for vendor user: ${user.id}`);
    return this.vendorService.rejectOrder(orderId, user.id, rejectOrderDto);
  }
}
