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
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/interfaces/user.interface';
import { CreateOrderDto, OrderResponseDto } from '../common/dto/order.dto';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @CurrentUser() user: User,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for user: ${user.id}`);
    return this.orderService.create(user.id, createOrderDto);
  }

  @Get()
  async getUserOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for user: ${user.id}`);
    return this.orderService.findByUser(user.id);
  }

  @Put(':id/cancel')
  async cancelOrder(
    @Param('id') orderId: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    this.logger.log(`Cancelling order ${orderId} for user: ${user.id}`);
    return this.orderService.cancelOrder(orderId, user.id);
  }
}
