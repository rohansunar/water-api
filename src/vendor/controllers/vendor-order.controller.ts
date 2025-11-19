import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorOrderService } from '../services/vendor-order.service';
import { VendorJwtAuthGuard } from '../guards/vendor-jwt-auth.guard';
import { CurrentVendor } from '../decorators/current-vendor.decorator';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../order/dto/order.dto';
import {
  OrderSummaryDto,
  AcceptOrderDto,
  RejectOrderDto,
  PaginationQueryDto,
  PaginatedResponseDto,
} from '../dto/vendor.dto';
import { Vendor } from '../interfaces/vendor.interface';

@ApiTags('Vendor Orders')
@Controller('vendors/me/orders')
@UseGuards(VendorJwtAuthGuard)
export class VendorOrderController {
  private readonly logger = new Logger(VendorOrderController.name);

  constructor(private readonly vendorOrderService: VendorOrderService) {}

  /**
   * Retrieves all orders for the authenticated vendor.
   * @param vendorId - The ID of the vendor.
   * @returns A promise that resolves to an array of OrderResponseDto.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all orders for the vendor',
    description: 'Retrieve all orders associated with the authenticated vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async getVendorOrders(
    @CurrentVendor() vendor: Vendor,
  ): Promise<OrderResponseDto[]> {
    const { id } = vendor;
    try {
      this.logger.log(`Getting orders for vendor: ${id}`);
      return await this.vendorOrderService.getVendorOrders(vendor);
    } catch (error) {
      this.logger.error(`Error getting orders for vendor ${id}:`, error);
      throw error;
    }
  }

  /**
   * Updates the status of a specific order.
   * @param orderId - The ID of the order to update.
   * @param vendorId - The ID of the vendor.
   * @param updateOrderStatusDto - The DTO containing the new status.
   * @returns A promise that resolves to the updated OrderResponseDto.
   */
  @Put(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update order status',
    description:
      'Update the status of a specific order for the authenticated vendor',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid status or order ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentVendor() vendor: Vendor,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const { id } = vendor;
    try {
      this.logger.log(`Updating order ${orderId} status for vendor: ${id}`);
      return await this.vendorOrderService.updateOrderStatus(
        orderId,
        vendor,
        updateOrderStatusDto,
      );
    } catch (error) {
      this.logger.error(
        `Error updating order ${orderId} status for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves pending orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pending orders',
    description:
      'Retrieve pending orders for the authenticated vendor with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Pending orders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/OrderSummaryDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getPendingOrders(
    @CurrentVendor() vendor: Vendor,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const { id } = vendor;
    try {
      this.logger.log(`Getting pending orders for vendor: ${id}`);
      return await this.vendorOrderService.getPendingOrders(
        vendor,
        paginationQuery,
      );
    } catch (error) {
      this.logger.error(
        `Error getting pending orders for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves completed orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  @Get('completed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get completed orders',
    description:
      'Retrieve completed orders for the authenticated vendor with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Completed orders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/OrderSummaryDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getCompletedOrders(
    @CurrentVendor() vendor: Vendor,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const { id } = vendor;
    try {
      this.logger.log(`Getting completed orders for vendor: ${id}`);
      return await this.vendorOrderService.getCompletedOrders(
        vendor,
        paginationQuery,
      );
    } catch (error) {
      this.logger.error(
        `Error getting completed orders for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves cancelled orders for the authenticated vendor with pagination.
   * @param vendorId - The ID of the vendor.
   * @param paginationQuery - Pagination parameters.
   * @returns A promise that resolves to a paginated response of OrderSummaryDto.
   */
  @Get('cancelled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cancelled orders',
    description:
      'Retrieve cancelled orders for the authenticated vendor with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Cancelled orders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/OrderSummaryDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getCancelledOrders(
    @CurrentVendor() vendor: Vendor,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderSummaryDto>> {
    const { id } = vendor;
    try {
      this.logger.log(`Getting cancelled orders for vendor: ${id}`);
      return await this.vendorOrderService.getCancelledOrders(
        vendor,
        paginationQuery,
      );
    } catch (error) {
      this.logger.error(
        `Error getting cancelled orders for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Accepts a specific order.
   * @param orderId - The ID of the order to accept.
   * @param vendorId - The ID of the vendor.
   * @param acceptOrderDto - The DTO containing acceptance details.
   * @returns A promise that resolves to the accepted OrderSummaryDto.
   */
  @Post(':orderId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept order',
    description: 'Accept a specific order for the authenticated vendor',
  })
  @ApiBody({ type: AcceptOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order accepted successfully',
    type: OrderSummaryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid acceptance details',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async acceptOrder(
    @Param('orderId') orderId: string,
    @CurrentVendor() vendor: Vendor,
    @Body() acceptOrderDto: AcceptOrderDto,
  ): Promise<OrderSummaryDto> {
    const { id } = vendor;
    try {
      this.logger.log(`Accepting order ${orderId} for vendor: ${id}`);
      return await this.vendorOrderService.acceptOrder(
        orderId,
        vendor,
        acceptOrderDto,
      );
    } catch (error) {
      this.logger.error(
        `Error accepting order ${orderId} for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Rejects a specific order.
   * @param orderId - The ID of the order to reject.
   * @param vendorId - The ID of the vendor.
   * @param rejectOrderDto - The DTO containing rejection details.
   * @returns A promise that resolves to a message indicating rejection.
   */
  @Post(':orderId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject order',
    description: 'Reject a specific order for the authenticated vendor',
  })
  @ApiBody({ type: RejectOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Order rejected successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid rejection details',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async rejectOrder(
    @Param('orderId') orderId: string,
    @CurrentVendor() vendor: Vendor,
    @Body() rejectOrderDto: RejectOrderDto,
  ): Promise<{ message: string }> {
    const { id } = vendor;
    try {
      this.logger.log(`Rejecting order ${orderId} for vendor: ${id}`);
      return await this.vendorOrderService.rejectOrder(
        orderId,
        vendor,
        rejectOrderDto,
      );
    } catch (error) {
      this.logger.error(
        `Error rejecting order ${orderId} for vendor ${id}:`,
        error,
      );
      throw error;
    }
  }
}
