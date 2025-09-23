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
  RiderService,
  DeliveryRider,
  LocationUpdateDto,
} from './rider.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../common/interfaces/user.interface';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../common/dto/order.dto';

@Controller('riders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_RIDER)
export class RiderController {
  private readonly logger = new Logger(RiderController.name);

  constructor(private readonly riderService: RiderService) {}

  @Get('orders')
  async getRiderOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for delivery rider user: ${user.id}`);
    return this.riderService.getRiderOrders(user.id);
  }

  @Put('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Updating order ${orderId} status for delivery rider user: ${user.id}`,
    );
    return this.riderService.updateOrderStatus(
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
    this.logger.log(`Updating location for delivery rider user: ${user.id}`);
    return this.riderService.updateLocation(user.id, locationUpdateDto);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: User): Promise<DeliveryRider> {
    this.logger.log(`Getting profile for delivery rider user: ${user.id}`);
    return this.riderService.getRiderProfile(user.id);
  }

  @Put('availability')
  async updateAvailability(
    @CurrentUser() user: User,
    @Body() availabilityDto: { isAvailable: boolean },
  ): Promise<DeliveryRider> {
    this.logger.log(
      `Updating availability for delivery rider user: ${user.id}`,
    );
    return this.riderService.updateAvailability(
      user.id,
      availabilityDto.isAvailable,
    );
  }
}
