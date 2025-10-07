import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User as UserEntity } from '../modules/user/entities/user.entity';
import { CustomerProfileDto } from '../common/dto/auth.dto';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  SetDefaultAddressDto,
  PaginationQueryDto,
} from '../common/dto/customer.dto';
import { CustomLoggerService } from '../common/logger/logger.service';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly logger: CustomLoggerService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current customer profile',
    description:
      'Retrieve the profile information of the currently authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer profile retrieved successfully',
    type: CustomerProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Customer not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getProfile(
    @CurrentUser() customer: UserEntity,
  ): Promise<CustomerProfileDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Getting profile for customer: ${customer._id}`);
      const profile = await this.customerService.getCustomerProfile(
        customer._id.toString(),
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/me',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/me',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Put('monthly-payment-mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update monthly payment mode',
    description: 'Enable or disable monthly payment mode for the customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Monthly payment mode updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Monthly payment mode updated successfully',
        },
        monthlyPaymentMode: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async updateMonthlyPaymentMode(
    @CurrentUser() customer: UserEntity,
    @Body() updateDto: { monthlyPaymentMode: boolean },
  ): Promise<{ message: string; monthlyPaymentMode: boolean }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating monthly payment mode for customer: ${customer._id.toString()} to ${updateDto.monthlyPaymentMode}`,
      );

      await this.customerService.updateMonthlyPaymentMode(
        customer._id.toString(),
        updateDto.monthlyPaymentMode,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/monthly-payment-mode',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return {
        message: 'Monthly payment mode updated successfully',
        monthlyPaymentMode: updateDto.monthlyPaymentMode,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/monthly-payment-mode',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  // Address Management Endpoints
  @Get('addresses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all customer addresses',
    description:
      'Retrieve all addresses associated with the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer addresses retrieved successfully',
    type: [AddressResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCustomerAddresses(
    @CurrentUser() customer: UserEntity,
  ): Promise<AddressResponseDto[]> {
    const startTime = Date.now();

    try {
      this.logger.log(`Getting addresses for customer: ${customer._id.toString()}`);
      const addresses = await this.customerService.getCustomerAddresses(
        customer._id.toString(),
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/addresses',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return addresses;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/addresses',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add new address',
    description: 'Add a new address for the authenticated customer',
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createAddress(
    @CurrentUser() customer: UserEntity,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Creating address for customer: ${customer._id.toString()}`);
      const address = await this.customerService.createAddress(
        customer._id.toString(),
        createAddressDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        '/customers/addresses',
        HttpStatus.CREATED,
        duration,
        { userId: customer._id.toString() },
      );

      return address;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/addresses',
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Put('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update address',
    description: 'Update an existing address for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: AddressResponseDto,
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
    description: 'Address not found',
  })
  async updateAddress(
    @CurrentUser() customer: UserEntity,
    @Param('id') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating address ${addressId} for customer: ${customer._id.toString()}`,
      );
      const address = await this.customerService.updateAddress(
        customer._id.toString(),
        addressId,
        updateAddressDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/addresses/${addressId}`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return address;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/addresses/${addressId}`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete address',
    description: 'Delete an existing address for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Address deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Address not found',
  })
  async deleteAddress(
    @CurrentUser() customer: UserEntity,
    @Param('id') addressId: string,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Deleting address ${addressId} for customer: ${customer._id.toString()}`,
      );
      await this.customerService.deleteAddress(customer._id.toString(), addressId);

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'DELETE',
        `/customers/addresses/${addressId}`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return { message: 'Address deleted successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/addresses/${addressId}`,
        'DELETE',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Put('addresses/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set default address',
    description:
      'Set a specific address as the default for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Default address set successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Default address set successfully',
        },
      },
    },
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
    description: 'Address not found',
  })
  async setDefaultAddress(
    @CurrentUser() customer: UserEntity,
    @Param('id') addressId: string,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Setting address ${addressId} as default for customer: ${customer._id.toString()}`,
      );
      await this.customerService.setDefaultAddress(customer._id.toString(), addressId);

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/addresses/${addressId}/default`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return { message: 'Default address set successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/addresses/${addressId}/default`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  // Order History Endpoints
  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get customer order history',
    description:
      'Retrieve paginated order history for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Order history retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getOrderHistory(
    @CurrentUser() customer: UserEntity,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(`Getting order history for customer: ${customer._id.toString()}`);
      const result = await this.customerService.getOrderHistory(
        customer._id.toString(),
        paginationQuery.page || 1,
        paginationQuery.limit || 10,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/orders',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/orders',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get specific order details',
    description: 'Retrieve detailed information for a specific order',
  })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async getOrderDetails(
    @CurrentUser() customer: UserEntity,
    @Param('id') orderId: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Getting order details ${orderId} for customer: ${customer._id.toString()}`,
      );
      const order = await this.customerService.getOrderDetails(
        customer._id.toString(),
        orderId,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        `/customers/orders/${orderId}`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return order;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/orders/${orderId}`,
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel a specific order for the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Order cannot be cancelled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async cancelOrder(
    @CurrentUser() customer: UserEntity,
    @Param('id') orderId: string,
    @Body() cancelOrderDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Cancelling order ${orderId} for customer: ${customer._id.toString()}`,
      );
      await this.customerService.cancelOrder(
        customer._id.toString(),
        orderId,
        cancelOrderDto.reason,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        `/customers/orders/${orderId}/cancel`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return { message: 'Order cancelled successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/orders/${orderId}/cancel`,
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request refund',
    description: 'Request a refund for a specific order',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Refund request cannot be processed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async requestRefund(
    @CurrentUser() customer: UserEntity,
    @Param('id') orderId: string,
    @Body() refundRequestDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Requesting refund for order ${orderId} for customer: ${customer._id.toString()}`,
      );
      await this.customerService.requestRefund(
        customer._id.toString(),
        orderId,
        refundRequestDto.reason,
        refundRequestDto.description,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        `/customers/orders/${orderId}/refund`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return { message: 'Refund request submitted successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        `/customers/orders/${orderId}/refund`,
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

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
    @CurrentUser() customer: UserEntity,
  ): Promise<any[]> {
    const startTime = Date.now();

    try {
      this.logger.log(`Getting subscriptions for customer: ${customer._id.toString()}`);
      const subscriptions = await this.customerService.getCustomerSubscriptions(
        customer._id.toString(),
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/subscriptions',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
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
    @CurrentUser() customer: UserEntity,
    @Body() createSubscriptionDto: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(`Creating subscription for customer: ${customer._id.toString()}`);
      const subscription = await this.customerService.createSubscription(
        customer._id.toString(),
        createSubscriptionDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        '/customers/subscriptions',
        HttpStatus.CREATED,
        duration,
        { userId: customer._id.toString() },
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
    @CurrentUser() customer: UserEntity,
    @Param('id') subscriptionId: string,
    @Body() updateSubscriptionDto: any,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating subscription ${subscriptionId} for customer: ${customer._id.toString()}`,
      );
      const subscription = await this.customerService.updateSubscription(
        customer._id.toString(),
        subscriptionId,
        updateSubscriptionDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
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
    @CurrentUser() customer: UserEntity,
    @Param('id') subscriptionId: string,
    @Body() cancelSubscriptionDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Cancelling subscription ${subscriptionId} for customer: ${customer._id.toString()}`,
      );
      await this.customerService.cancelSubscription(
        customer._id.toString(),
        subscriptionId,
        cancelSubscriptionDto.reason,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'DELETE',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
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

  // Profile Management Endpoints
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update customer profile',
    description: 'Update the profile information of the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: CustomerProfileDto,
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
    description: 'Customer not found',
  })
  async updateProfile(
    @CurrentUser() customer: UserEntity,
    @Body() updateProfileDto: any,
  ): Promise<CustomerProfileDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Updating profile for customer: ${customer._id.toString()}`);
      const profile = await this.customerService.updateProfile(
        customer._id.toString(),
        updateProfileDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/profile',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/profile',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update customer preferences',
    description: 'Update the preferences of the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Preferences updated successfully',
        },
      },
    },
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
    description: 'Customer not found',
  })
  async updatePreferences(
    @CurrentUser() customer: UserEntity,
    @Body() updatePreferencesDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(`Updating preferences for customer: ${customer._id.toString()}`);
      await this.customerService.updatePreferences(
        customer._id.toString(),
        updatePreferencesDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/preferences',
        HttpStatus.OK,
        duration,
        { userId: customer._id.toString() },
      );

      return { message: 'Preferences updated successfully' };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError(
        '/customers/preferences',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
      throw error;
    }
  }
}
