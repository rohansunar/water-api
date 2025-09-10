import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../common/interfaces/user.interface';
import {
  CreateProductDto,
  ProductResponseDto,
} from '../common/dto/product.dto';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../common/dto/order.dto';

@Controller('api/vendor')
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
}
