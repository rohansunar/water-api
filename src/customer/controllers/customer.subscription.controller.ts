import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SubscriptionService } from '../services/subscription.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../common/interfaces/user.interface';
import { CustomLoggerService } from '../../common/logger/logger.service';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerSubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly logger: CustomLoggerService,
  ) {}

  // Subscription Management Endpoints
  @Get('subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get customer subscriptions',
    description: 'Retrieve all subscriptions for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer subscriptions retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCustomerSubscriptions(
    @CurrentUser() customer: User,
  ): Promise<any[]> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Getting subscriptions for customer: ${customer.id.toString()}`,
      );
      const subscriptions =
        await this.subscriptionService.getCustomerSubscriptions(
          customer.id.toString(),
        );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/subscriptions',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
      );

      return subscriptions;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/subscriptions',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to product',
    description: 'Create a new subscription for a product',
  })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createSubscription(
    @CurrentUser() customer: User,
    @Body() createSubscriptionDto: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Creating subscription for customer: ${customer.id.toString()}`,
      );
      const subscription = await this.subscriptionService.createSubscription(
        customer.id.toString(),
        createSubscriptionDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        '/customers/subscriptions',
        HttpStatus.CREATED,
        duration,
        { userId: customer.id.toString() },
      );

      return subscription;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/subscriptions',
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Put('subscriptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update subscription',
    description: 'Update an existing subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async updateSubscription(
    @CurrentUser() customer: User,
    @Param('id') subscriptionId: string,
    @Body() updateSubscriptionDto: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating subscription ${subscriptionId} for customer: ${customer.id.toString()}`,
      );
      const subscription = await this.subscriptionService.updateSubscription(
        customer.id.toString(),
        subscriptionId,
        updateSubscriptionDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
      );

      return subscription;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/subscriptions/${subscriptionId}`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Delete('subscriptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'Cancel an existing subscription',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', type: String })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Subscription cannot be cancelled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async cancelSubscription(
    @CurrentUser() customer: User,
    @Param('id') subscriptionId: string,
    @Body() cancelSubscriptionDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Cancelling subscription ${subscriptionId} for customer: ${customer.id.toString()}`,
      );
      await this.subscriptionService.cancelSubscription(
        customer.id.toString(),
        subscriptionId,
        cancelSubscriptionDto.reason,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'DELETE',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
      );

      return { message: 'Subscription cancelled successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/subscriptions/${subscriptionId}`,
        'DELETE',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }
}
