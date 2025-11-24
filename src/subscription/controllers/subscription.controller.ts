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
import { SubscriptionService } from '../services/subscription.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
} from '../dto/subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiTags('Subscriptions')
@ApiBearerAuth()
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create subscription',
    description: 'Create a new subscription',
  })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createSubscription(
    @CurrentUser() user: User,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Creating subscription for user: ${user.id}`);
    return this.subscriptionService.create(user.id, createSubscriptionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user subscriptions',
    description: 'Retrieve all subscriptions for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserSubscriptions(
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto[]> {
    this.logger.log(`Getting subscriptions for user: ${user.id}`);
    return this.subscriptionService.findByUser(user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update subscription',
    description: 'Update an existing subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiBody({ type: UpdateSubscriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Updating subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.update(
      subscriptionId,
      user.id,
      updateSubscriptionDto,
    );
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'Cancel an existing subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Cancelling subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.cancel(subscriptionId, user.id);
  }

  @Put(':id/pause')
  @ApiOperation({
    summary: 'Pause subscription',
    description: 'Pause an existing subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Subscription paused successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async pauseSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Pausing subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.pause(subscriptionId, user.id);
  }

  @Put(':id/resume')
  @ApiOperation({
    summary: 'Resume subscription',
    description: 'Resume a paused subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async resumeSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Resuming subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.resume(subscriptionId, user.id);
  }
  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get subscription analytics',
    description: 'Retrieve analytics for a specific subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSubscriptionAnalytics(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    this.logger.log(
      `Getting analytics for subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.getAnalytics(subscriptionId, user.id);
  }
}
