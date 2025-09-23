import { Controller, Get, Put, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Customer } from '../common/interfaces/customer.interface';
import { CustomerProfileDto } from '../common/dto/auth.dto';
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
    description: 'Retrieve the profile information of the currently authenticated customer',
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
  async getProfile(@CurrentUser() customer: Customer): Promise<CustomerProfileDto> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Getting profile for customer: ${customer.id}`);
      const profile = await this.customerService.getCustomerProfile(customer.id);
      
      const duration = Date.now() - startTime;
      this.logger.logApiRequest('GET', '/customers/me', HttpStatus.OK, duration, { userId: customer.id });
      
      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logApiError('/customers/me', 'GET', HttpStatus.INTERNAL_SERVER_ERROR, error);
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
    @CurrentUser() customer: Customer,
    @Body() updateDto: { monthlyPaymentMode: boolean },
  ): Promise<{ message: string; monthlyPaymentMode: boolean }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(
        `Updating monthly payment mode for customer: ${customer.id} to ${updateDto.monthlyPaymentMode}`,
      );
      
      await this.customerService.updateMonthlyPaymentMode(
        customer.id,
        updateDto.monthlyPaymentMode,
      );
      
      const duration = Date.now() - startTime;
      this.logger.logApiRequest(
        'PUT', 
        '/customers/monthly-payment-mode', 
        HttpStatus.OK, 
        duration, 
        { userId: customer.id }
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
        error
      );
      throw error;
    }
  }
}
