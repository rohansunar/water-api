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
  CustomerVerifyOtpDto,
  CustomerAuthResponseDto,
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

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Verify OTP and complete customer authentication',
    description: 'Verify the OTP sent to the phone number and return JWT token',
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
        otp: {
          type: 'string',
          example: '123456',
          description: '6-digit OTP code',
        },
      },
      required: ['phone', 'otp'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: CustomerAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or phone number',
  })
  @ApiResponse({
    status: 401,
    description: 'OTP expired or invalid',
  })
  async verifyOtp(
    @Body() verifyDto: CustomerVerifyOtpDto,
  ): Promise<CustomerAuthResponseDto> {
    this.logger.log(`Customer OTP verification for phone: ${verifyDto.phone}`);
    return this.customerAuthService.verifyOtp(verifyDto);
  }

  @Get('me')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current customer profile',
    description:
      'Retrieve the profile information of the authenticated customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer profile not found',
  })
  async getProfile(@CurrentUser() user: any) {
    this.logger.log(`Getting profile for customer user: ${user.id}`);
    return this.customerAuthService.getCustomerProfile(user.id);
  }
}
