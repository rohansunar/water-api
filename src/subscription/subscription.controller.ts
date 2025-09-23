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
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/interfaces/user.interface';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
} from '../common/dto/subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  async createSubscription(
    @CurrentUser() user: User,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Creating subscription for user: ${user.id}`);
    return this.subscriptionService.create(user.id, createSubscriptionDto);
  }

  @Get()
  async getUserSubscriptions(
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto[]> {
    this.logger.log(`Getting subscriptions for user: ${user.id}`);
    return this.subscriptionService.findByUser(user.id);
  }

  @Put(':id')
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
  async resumeSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Resuming subscription ${subscriptionId} for user: ${user.id}`,
    );
    return this.subscriptionService.resume(subscriptionId, user.id);
  }
}
