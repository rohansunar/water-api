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
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CustomerProfileDto } from '../../common/dto/auth.dto';
import { User } from '../../common/interfaces/user.interface';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  SetDefaultAddressDto,
  PaginationQueryDto,
} from '../../common/dto/customer.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';

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
  async getProfile(@CurrentUser() customer: User): Promise<CustomerProfileDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Getting profile for customer: ${customer.id}`);
      const profile = await this.customerService.getCustomerProfile(
        customer.id.toString(),
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/me',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: { monthlyPaymentMode: { type: 'boolean' } },
    },
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
    @CurrentUser() customer: User,
    @Body() updateDto: { monthlyPaymentMode: boolean },
  ): Promise<{ message: string; monthlyPaymentMode: boolean }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating monthly payment mode for customer: ${customer.id.toString()} to ${updateDto.monthlyPaymentMode}`,
      );

      await this.customerService.updateMonthlyPaymentMode(
        customer.id.toString(),
        updateDto.monthlyPaymentMode,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/monthly-payment-mode',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
    @CurrentUser() customer: User,
  ): Promise<AddressResponseDto[]> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Getting addresses for customer: ${customer.id.toString()}`,
      );
      const addresses = await this.customerService.getCustomerAddresses(
        customer.id.toString(),
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/addresses',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
    schema: {
      type: 'object',
      properties: {
        address: { $ref: '#/components/schemas/AddressResponseDto' },
        isDefaultSetAutomatically: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'isDefault was set to true automatically since this is the first address.',
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
  async createAddress(
    @CurrentUser() customer: User,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<{
    address: AddressResponseDto;
    isDefaultSetAutomatically: boolean;
    message: string;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Creating address for customer: ${customer.id.toString()}`,
      );
      const result = await this.customerService.createAddress(
        customer.id.toString(),
        createAddressDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        '/customers/addresses',
        HttpStatus.CREATED,
        duration,
        { userId: customer.id.toString() },
      );

      return result;
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
  @ApiParam({ name: 'id', description: 'Address ID', type: String })
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
    @CurrentUser() customer: User,
    @Param('id') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating address ${addressId} for customer: ${customer.id.toString()}`,
      );
      const address = await this.customerService.updateAddress(
        customer.id.toString(),
        addressId,
        updateAddressDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/addresses/${addressId}`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiParam({ name: 'id', description: 'Address ID', type: String })
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
    @CurrentUser() customer: User,
    @Param('id') addressId: string,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Deleting address ${addressId} for customer: ${customer.id.toString()}`,
      );
      await this.customerService.deleteAddress(
        customer.id.toString(),
        addressId,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'DELETE',
        `/customers/addresses/${addressId}`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiParam({ name: 'id', description: 'Address ID', type: String })
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
    @CurrentUser() customer: User,
    @Param('id') addressId: string,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Setting address ${addressId} as default for customer: ${customer.id.toString()}`,
      );
      await this.customerService.setDefaultAddress(
        customer.id.toString(),
        addressId,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        `/customers/addresses/${addressId}/default`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiQuery({ type: PaginationQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Order history retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getOrderHistory(
    @CurrentUser() customer: User,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Getting order history for customer: ${customer.id.toString()}`,
      );
      const result = await this.customerService.getOrderHistory(
        customer.id.toString(),
        paginationQuery.page || 1,
        paginationQuery.limit || 10,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        '/customers/orders',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
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
    @CurrentUser() customer: User,
    @Param('id') orderId: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Getting order details ${orderId} for customer: ${customer.id.toString()}`,
      );
      const order = await this.customerService.getOrderDetails(
        customer.id.toString(),
        orderId,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'GET',
        `/customers/orders/${orderId}`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
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
    @CurrentUser() customer: User,
    @Param('id') orderId: string,
    @Body() cancelOrderDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Cancelling order ${orderId} for customer: ${customer.id.toString()}`,
      );
      await this.customerService.cancelOrder(
        customer.id.toString(),
        orderId,
        cancelOrderDto.reason,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'POST',
        `/customers/orders/${orderId}/cancel`,
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        description: { type: 'string' },
      },
    },
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
    @CurrentUser() customer: User,
    @Param('id') orderId: string,
    @Body() refundRequestDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Requesting refund for order ${orderId} for customer: ${customer.id.toString()}`,
      );
      await this.customerService.requestRefund(
        customer.id.toString(),
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
        { userId: customer.id.toString() },
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

  // Profile Management Endpoints
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update customer profile',
    description: 'Update the profile information of the authenticated customer',
  })
  @ApiBody({ schema: { type: 'object' } })
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
    @CurrentUser() customer: User,
    @Body() updateProfileDto: any,
  ): Promise<CustomerProfileDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating profile for customer: ${customer.id.toString()}`,
      );
      const profile = await this.customerService.updateProfile(
        customer.id.toString(),
        updateProfileDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/profile',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
  @ApiBody({ schema: { type: 'object' } })
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
    @CurrentUser() customer: User,
    @Body() updatePreferencesDto: any,
  ): Promise<{ message: string }> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Updating preferences for customer: ${customer.id.toString()}`,
      );
      await this.customerService.updatePreferences(
        customer.id.toString(),
        updatePreferencesDto,
      );

      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT',
        '/customers/preferences',
        HttpStatus.OK,
        duration,
        { userId: customer.id.toString() },
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
