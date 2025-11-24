import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import { CreateOrderDto, OrderResponseDto } from '../dto/order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiTags('Orders')
@ApiBearerAuth()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order', description: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createOrder(
    @CurrentUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for user: ${user.id}`);
    return this.orderService.create(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user orders',
    description: 'Retrieve all orders for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for user: ${user.id}`);
    return this.orderService.findByUser(user.id);
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel an existing order',
  })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async cancelOrder(
    @Param('id') orderId: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    this.logger.log(`Cancelling order ${orderId} for user: ${user.id}`);
    return this.orderService.cancelOrder(orderId, user.id);
  }
}
