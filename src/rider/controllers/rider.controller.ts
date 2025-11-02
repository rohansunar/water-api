import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
import { RiderService, DeliveryRider } from '../services/rider.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../common/interfaces/user.interface';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../common/dto/order.dto';
import {
  LocationUpdateDto,
  UpdateAvailabilityDto,
  DeliveryRiderResponseDto,
  LocationUpdateResponseDto,
  // Delivery History DTOs
  DeliveryHistoryDto,
  DeliveryStatsDto,
  RateDeliveryDto,
  UpcomingDeliveryDto,
  // Route Optimization DTOs
  RouteOptimizationDto,
  RoutePreferencesDto,
  RouteHistoryDto,
  // Performance Tracking DTOs
  PerformanceMetricsDto,
  RiderRatingDto,
  LeaderboardPositionDto,
  PerformanceGoalsDto,
  // Availability & Scheduling DTOs
  ScheduleSlotDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  AvailabilityStatusDto,
  // Pagination DTOs
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../common/dto/rider.dto';

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

  // ===== DELIVERY HISTORY ENDPOINTS =====

  @Get('deliveries')
  @ApiOperation({
    summary: 'Get delivery history with pagination',
    description:
      'Retrieve paginated delivery history for the authenticated rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery history retrieved successfully',
    type: PaginationResponseDto<DeliveryHistoryDto>,
  })
  async getDeliveryHistory(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<DeliveryHistoryDto>> {
    this.logger.log(`Getting delivery history for rider user: ${user.id}`);
    return this.riderService.getDeliveryHistory(user.id, paginationDto);
  }

  @Get('deliveries/:id')
  @ApiOperation({
    summary: 'Get specific delivery details',
    description: 'Retrieve detailed information about a specific delivery',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique delivery identifier',
    example: 'delivery-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery details retrieved successfully',
    type: DeliveryHistoryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Delivery not found',
  })
  async getDeliveryDetails(
    @Param('id') deliveryId: string,
    @CurrentUser() user: User,
  ): Promise<DeliveryHistoryDto> {
    this.logger.log(
      `Getting delivery details ${deliveryId} for rider user: ${user.id}`,
    );
    return this.riderService.getDeliveryDetails(user.id, deliveryId);
  }

  @Get('deliveries/stats')
  @ApiOperation({
    summary: 'Get delivery statistics',
    description: 'Retrieve delivery performance statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery statistics retrieved successfully',
    type: DeliveryStatsDto,
  })
  async getDeliveryStats(@CurrentUser() user: User): Promise<DeliveryStatsDto> {
    this.logger.log(`Getting delivery stats for rider user: ${user.id}`);
    return this.riderService.getDeliveryStats(user.id);
  }

  @Post('deliveries/:id/rate')
  @ApiOperation({
    summary: 'Rate delivery experience',
    description: 'Submit rating and feedback for a completed delivery',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique delivery identifier',
    example: 'delivery-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: RateDeliveryDto })
  @ApiResponse({
    status: 200,
    description: 'Delivery rated successfully',
    type: DeliveryHistoryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid rating or delivery not eligible for rating',
  })
  async rateDelivery(
    @Param('id') deliveryId: string,
    @CurrentUser() user: User,
    @Body() rateDto: RateDeliveryDto,
  ): Promise<DeliveryHistoryDto> {
    this.logger.log(`Rating delivery ${deliveryId} for rider user: ${user.id}`);
    return this.riderService.rateDelivery(user.id, deliveryId, rateDto);
  }

  @Get('deliveries/upcoming')
  @ApiOperation({
    summary: 'Get upcoming scheduled deliveries',
    description: 'Retrieve upcoming deliveries scheduled for the rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming deliveries retrieved successfully',
    type: [UpcomingDeliveryDto],
  })
  async getUpcomingDeliveries(
    @CurrentUser() user: User,
  ): Promise<UpcomingDeliveryDto[]> {
    this.logger.log(`Getting upcoming deliveries for rider user: ${user.id}`);
    return this.riderService.getUpcomingDeliveries(user.id);
  }

  // ===== ROUTE OPTIMIZATION ENDPOINTS =====

  @Get('routes/optimize')
  @ApiOperation({
    summary: 'Get optimized delivery route',
    description: 'Retrieve optimized route for assigned deliveries',
  })
  @ApiResponse({
    status: 200,
    description: 'Route optimized successfully',
    type: RouteOptimizationDto,
  })
  async getOptimizedRoute(
    @CurrentUser() user: User,
  ): Promise<RouteOptimizationDto> {
    this.logger.log(`Getting optimized route for rider user: ${user.id}`);
    return this.riderService.getOptimizedRoute(user.id);
  }

  @Post('routes/preferences')
  @ApiOperation({
    summary: 'Set route preferences',
    description: 'Update rider preferences for route optimization',
  })
  @ApiBody({ type: RoutePreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Route preferences updated successfully',
    type: RoutePreferencesDto,
  })
  async setRoutePreferences(
    @CurrentUser() user: User,
    @Body() preferencesDto: RoutePreferencesDto,
  ): Promise<RoutePreferencesDto> {
    this.logger.log(`Setting route preferences for rider user: ${user.id}`);
    return this.riderService.setRoutePreferences(user.id, preferencesDto);
  }

  @Get('routes/history')
  @ApiOperation({
    summary: 'Get route history',
    description: 'Retrieve route history with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Route history retrieved successfully',
    type: PaginationResponseDto<RouteHistoryDto>,
  })
  async getRouteHistory(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<RouteHistoryDto>> {
    this.logger.log(`Getting route history for rider user: ${user.id}`);
    return this.riderService.getRouteHistory(user.id, paginationDto);
  }

  @Post('routes/:id/complete')
  @ApiOperation({
    summary: 'Mark route as completed',
    description: 'Mark a delivery route as completed',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique route identifier',
    example: 'route-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Route marked as completed successfully',
    type: RouteHistoryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid route or route not assigned to rider',
  })
  async completeRoute(
    @Param('id') routeId: string,
    @CurrentUser() user: User,
  ): Promise<RouteHistoryDto> {
    this.logger.log(`Completing route ${routeId} for rider user: ${user.id}`);
    return this.riderService.completeRoute(user.id, routeId);
  }

  // ===== PERFORMANCE TRACKING ENDPOINTS =====

  @Get('performance')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Retrieve comprehensive performance metrics for the rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    type: PerformanceMetricsDto,
  })
  async getPerformanceMetrics(
    @CurrentUser() user: User,
  ): Promise<PerformanceMetricsDto> {
    this.logger.log(`Getting performance metrics for rider user: ${user.id}`);
    return this.riderService.getPerformanceMetrics(user.id);
  }

  @Get('performance/rating')
  @ApiOperation({
    summary: 'Get rider rating details',
    description: 'Retrieve detailed rating information and history',
  })
  @ApiResponse({
    status: 200,
    description: 'Rating details retrieved successfully',
    type: RiderRatingDto,
  })
  async getRiderRating(@CurrentUser() user: User): Promise<RiderRatingDto> {
    this.logger.log(`Getting rating details for rider user: ${user.id}`);
    return this.riderService.getRiderRating(user.id);
  }

  @Get('performance/leaderboard')
  @ApiOperation({
    summary: 'Get leaderboard position',
    description: 'Retrieve rider position in the performance leaderboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard position retrieved successfully',
    type: LeaderboardPositionDto,
  })
  async getLeaderboardPosition(
    @CurrentUser() user: User,
  ): Promise<LeaderboardPositionDto> {
    this.logger.log(`Getting leaderboard position for rider user: ${user.id}`);
    return this.riderService.getLeaderboardPosition(user.id);
  }

  @Get('performance/goals')
  @ApiOperation({
    summary: 'Get performance goals',
    description: 'Retrieve current performance goals and progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance goals retrieved successfully',
    type: PerformanceGoalsDto,
  })
  async getPerformanceGoals(
    @CurrentUser() user: User,
  ): Promise<PerformanceGoalsDto> {
    this.logger.log(`Getting performance goals for rider user: ${user.id}`);
    return this.riderService.getPerformanceGoals(user.id);
  }

  // ===== AVAILABILITY & SCHEDULING ENDPOINTS =====

  @Get('schedule')
  @ApiOperation({
    summary: 'Get rider schedule',
    description: 'Retrieve all schedule slots for the rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
    type: [ScheduleSlotDto],
  })
  async getSchedule(@CurrentUser() user: User): Promise<ScheduleSlotDto[]> {
    this.logger.log(`Getting schedule for rider user: ${user.id}`);
    return this.riderService.getSchedule(user.id);
  }

  @Post('schedule')
  @ApiOperation({
    summary: 'Set availability schedule',
    description: 'Create a new schedule slot for rider availability',
  })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({
    status: 201,
    description: 'Schedule slot created successfully',
    type: ScheduleSlotDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schedule slot or conflict with existing slot',
  })
  async createScheduleSlot(
    @CurrentUser() user: User,
    @Body() scheduleDto: CreateScheduleDto,
  ): Promise<ScheduleSlotDto> {
    this.logger.log(`Creating schedule slot for rider user: ${user.id}`);
    return this.riderService.createScheduleSlot(user.id, scheduleDto);
  }

  @Put('schedule/:id')
  @ApiOperation({
    summary: 'Update schedule slot',
    description: 'Update an existing schedule slot',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique schedule slot identifier',
    example: 'schedule-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({
    status: 200,
    description: 'Schedule slot updated successfully',
    type: ScheduleSlotDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule slot not found',
  })
  async updateScheduleSlot(
    @Param('id') slotId: string,
    @CurrentUser() user: User,
    @Body() updateDto: UpdateScheduleDto,
  ): Promise<ScheduleSlotDto> {
    this.logger.log(
      `Updating schedule slot ${slotId} for rider user: ${user.id}`,
    );
    return this.riderService.updateScheduleSlot(user.id, slotId, updateDto);
  }

  @Delete('schedule/:id')
  @ApiOperation({
    summary: 'Remove schedule slot',
    description: 'Delete a schedule slot',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique schedule slot identifier',
    example: 'schedule-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule slot deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule slot not found',
  })
  async deleteScheduleSlot(
    @Param('id') slotId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Deleting schedule slot ${slotId} for rider user: ${user.id}`,
    );
    return this.riderService.deleteScheduleSlot(user.id, slotId);
  }

  @Get('schedule/availability')
  @ApiOperation({
    summary: 'Check availability status',
    description: 'Check current availability status and schedule information',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability status retrieved successfully',
    type: AvailabilityStatusDto,
  })
  async getAvailabilityStatus(
    @CurrentUser() user: User,
  ): Promise<AvailabilityStatusDto> {
    this.logger.log(`Getting availability status for rider user: ${user.id}`);
    return this.riderService.getAvailabilityStatus(user.id);
  }

  // ===== PHASE 2 ADDITIONAL ENDPOINTS =====

  @Post('me/shift/end')
  @ApiOperation({
    summary: 'End shift with cash reconciliation',
    description: 'End the current shift and reconcile cash collected',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cashCollected: {
          type: 'number',
          description: 'Total cash collected during shift',
        },
        totalDeliveries: {
          type: 'number',
          description: 'Number of deliveries completed',
        },
        notes: {
          type: 'string',
          description: 'Optional notes about the shift',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shift ended successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        shiftSummary: {
          type: 'object',
          properties: {
            shiftId: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            totalDeliveries: { type: 'number' },
            cashCollected: { type: 'number' },
            status: { type: 'string' },
          },
        },
      },
    },
  })
  async endShift(
    @CurrentUser() user: User,
    @Body()
    shiftEndDto: {
      cashCollected: number;
      totalDeliveries: number;
      notes?: string;
    },
  ): Promise<{ message: string; shiftSummary: any }> {
    this.logger.log(`Ending shift for rider user: ${user.id}`);
    return this.riderService.endShift(user.id, shiftEndDto);
  }

  @Get('me/notifications')
  @ApiOperation({
    summary: 'Get notification history',
    description: 'Retrieve notification history for the rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              read: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        unreadCount: { type: 'number' },
      },
    },
  })
  async getNotifications(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationQueryDto,
  ): Promise<{ notifications: any[]; unreadCount: number }> {
    this.logger.log(`Getting notifications for rider user: ${user.id}`);
    return this.riderService.getNotifications(user.id, paginationDto);
  }

  @Post('me/support')
  @ApiOperation({
    summary: 'Create support ticket',
    description: 'Create a support ticket for rider assistance',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Support ticket subject' },
        message: {
          type: 'string',
          description: 'Detailed description of the issue',
        },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        category: { type: 'string', description: 'Issue category' },
      },
      required: ['subject', 'message'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Support ticket created successfully',
    schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        estimatedResolution: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createSupportTicket(
    @CurrentUser() user: User,
    @Body()
    supportDto: {
      subject: string;
      message: string;
      priority?: string;
      category?: string;
    },
  ): Promise<{
    ticketId: string;
    status: string;
    createdAt: Date;
    estimatedResolution: Date;
  }> {
    this.logger.log(`Creating support ticket for rider user: ${user.id}`);
    return this.riderService.createSupportTicket(user.id, supportDto);
  }

  @Post('me/tasks/:taskId/deliver')
  @ApiOperation({
    summary: 'Complete delivery with photo',
    description:
      'Mark delivery as completed and upload delivery confirmation photo',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task/delivery identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryNotes: {
          type: 'string',
          description: 'Optional delivery notes',
        },
        customerSignature: {
          type: 'string',
          description: 'Base64 encoded customer signature (optional)',
        },
        photoRequired: {
          type: 'boolean',
          description: 'Whether photo is required for this delivery',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery completed successfully',
    schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string' },
        completedAt: { type: 'string', format: 'date-time' },
        photoUrl: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async completeDelivery(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body()
    deliveryDto: {
      deliveryNotes?: string;
      customerSignature?: string;
      photoRequired?: boolean;
    },
  ): Promise<{
    taskId: string;
    status: string;
    completedAt: Date;
    photoUrl?: string;
    message: string;
  }> {
    this.logger.log(`Completing delivery ${taskId} for rider user: ${user.id}`);
    return this.riderService.completeDelivery(user.id, taskId, deliveryDto);
  }

  @Post('me/tasks/:taskId/fail')
  @ApiOperation({
    summary: 'Mark delivery as failed',
    description: 'Mark a delivery task as failed with reason',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task/delivery identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for delivery failure' },
        details: { type: 'string', description: 'Detailed explanation' },
        retryable: {
          type: 'boolean',
          description: 'Whether the delivery can be retried',
        },
        customerContacted: {
          type: 'boolean',
          description: 'Whether customer was contacted',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery marked as failed successfully',
    schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string' },
        failedAt: { type: 'string', format: 'date-time' },
        reason: { type: 'string' },
        canRetry: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async failDelivery(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body()
    failureDto: {
      reason: string;
      details?: string;
      retryable?: boolean;
      customerContacted?: boolean;
    },
  ): Promise<{
    taskId: string;
    status: string;
    failedAt: Date;
    reason: string;
    canRetry: boolean;
    message: string;
  }> {
    this.logger.log(`Failing delivery ${taskId} for rider user: ${user.id}`);
    return this.riderService.failDelivery(user.id, taskId, failureDto);
  }
}
