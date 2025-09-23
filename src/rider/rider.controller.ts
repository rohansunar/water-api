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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RiderService, DeliveryRider } from './rider.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../common/interfaces/user.interface';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../common/dto/order.dto';
import {
  LocationUpdateDto,
  UpdateAvailabilityDto,
  DeliveryRiderResponseDto,
  LocationUpdateResponseDto,
} from '../common/dto/rider.dto';

@ApiTags('Riders')
@ApiBearerAuth('JWT-auth')
@Controller('riders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_RIDER)
export class RiderController {
  private readonly logger = new Logger(RiderController.name);

  constructor(private readonly riderService: RiderService) {}

  @Get('orders')
  @ApiOperation({
    summary: 'Get assigned orders for rider',
    description:
      'Retrieve all orders assigned to the authenticated delivery rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a delivery rider',
  })
  async getRiderOrders(@CurrentUser() user: User): Promise<OrderResponseDto[]> {
    this.logger.log(`Getting orders for delivery rider user: ${user.id}`);
    return this.riderService.getRiderOrders(user.id);
  }

  @Put('orders/:orderId/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the delivery status of an assigned order',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Unique order identifier',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order status or order not assigned to rider',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
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
  @ApiOperation({
    summary: 'Update rider location',
    description: 'Update the current GPS location of the delivery rider',
  })
  @ApiBody({ type: LocationUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
    type: LocationUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid location coordinates',
  })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() locationUpdateDto: LocationUpdateDto,
  ): Promise<LocationUpdateResponseDto> {
    this.logger.log(`Updating location for delivery rider user: ${user.id}`);
    return this.riderService.updateLocation(user.id, locationUpdateDto);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get rider profile',
    description:
      'Retrieve the profile information of the authenticated delivery rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Rider profile retrieved successfully',
    type: DeliveryRiderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Rider profile not found',
  })
  async getProfile(
    @CurrentUser() user: User,
  ): Promise<DeliveryRiderResponseDto> {
    this.logger.log(`Getting profile for delivery rider user: ${user.id}`);
    return this.riderService.getRiderProfile(user.id);
  }

  @Put('availability')
  @ApiOperation({
    summary: 'Update rider availability',
    description:
      'Update whether the rider is available for new delivery assignments',
  })
  @ApiBody({ type: UpdateAvailabilityDto })
  @ApiResponse({
    status: 200,
    description: 'Availability updated successfully',
    type: DeliveryRiderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid availability status',
  })
  async updateAvailability(
    @CurrentUser() user: User,
    @Body() availabilityDto: UpdateAvailabilityDto,
  ): Promise<DeliveryRiderResponseDto> {
    this.logger.log(
      `Updating availability for delivery rider user: ${user.id}`,
    );
    return this.riderService.updateAvailability(
      user.id,
      availabilityDto.isAvailable,
    );
  }
}
