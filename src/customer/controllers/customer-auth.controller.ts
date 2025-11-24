import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomerJwtAuthGuard } from '../guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  CustomerLoginDto,
  CustomerSendOtpDto,
  CustomerVerifyOtpDto,
  CustomerAuthResponseDto,
  CustomerOtpResponseDto,
} from '../dto/customer-auth.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Customer Authentication')
@Controller('customers/auth')
export class CustomerAuthController {
  private readonly logger = new Logger(CustomerAuthController.name);

  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Initiate customer login with phone number',
    description:
      'Send OTP to the provided phone number for customer authentication',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          example: '+919876543210',
          description: 'Customer phone number',
        },
      },
      required: ['phone'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'OTP sent successfully to your phone number',
        },
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number',
  })
  async login(@Body() loginDto: CustomerLoginDto) {
    this.logger.log(`Customer login attempt for phone: ${loginDto.phone}`);
    return this.customerAuthService.login(loginDto);
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Send OTP for customer login',
    description:
      'Generate and send OTP to customer phone number for authentication',
  })
  @ApiBody({ type: CustomerSendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: CustomerOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid phone number or rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Too many OTP requests. Please try again later.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async requestOtp(
    @Body() sendOtpDto: CustomerSendOtpDto,
  ): Promise<CustomerOtpResponseDto> {
    this.logger.log(`Customer OTP request for phone: ${sendOtpDto.phone}`);
    return this.customerAuthService.requestOtp(sendOtpDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Verify OTP and authenticate customer',
    description: 'Verify the OTP code and authenticate the customer if valid',
  })
  @ApiBody({ type: CustomerVerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, customer authenticated',
    type: CustomerAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid OTP format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'OTP must be exactly 6 digits' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP or customer not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid OTP' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async verifyOtp(
    @Body() verifyOtpDto: CustomerVerifyOtpDto,
  ): Promise<CustomerAuthResponseDto> {
    this.logger.log(
      `Customer OTP verification for phone: ${verifyOtpDto.phone}`,
    );
    return this.customerAuthService.verifyOtp(verifyOtpDto);
  }
}
