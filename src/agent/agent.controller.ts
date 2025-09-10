import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  AgentService,
  DeliveryAgent,
  LocationUpdateDto,
} from './agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../common/interfaces/user.interface';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../common/dto/order.dto';

@Controller('api/agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_AGENT)
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Get('orders')
  async getAgentOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for delivery agent user: ${user.id}`);
    return this.agentService.getAgentOrders(user.id);
  }

  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Updating order ${orderId} status for delivery agent user: ${user.id}`,
    );
    return this.agentService.updateOrderStatus(
      orderId,
      user.id,
      updateOrderStatusDto,
    );
  }

  @Post('location')
  async updateLocation(
    @CurrentUser() user: User,
    @Body() locationUpdateDto: LocationUpdateDto,
  ): Promise<{ message: string; location: any }> {
    this.logger.log(`Updating location for delivery agent user: ${user.id}`);
    return this.agentService.updateLocation(user.id, locationUpdateDto);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: User): Promise<DeliveryAgent> {
    this.logger.log(`Getting profile for delivery agent user: ${user.id}`);
    return this.agentService.getAgentProfile(user.id);
  }

  @Put('availability')
  async updateAvailability(
    @CurrentUser() user: User,
    @Body() availabilityDto: { isAvailable: boolean },
  ): Promise<DeliveryAgent> {
    this.logger.log(
      `Updating availability for delivery agent user: ${user.id}`,
    );
    return this.agentService.updateAvailability(
      user.id,
      availabilityDto.isAvailable,
    );
  }
}
