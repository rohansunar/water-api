import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VendorAuthService } from '../services/vendor-auth.service';
import {
  VendorLoginDto,
  VendorAuthResponseDto,
  VendorSendOtpDto,
  VendorVerifyOtpDto,
  VendorOtpResponseDto,
} from '../dto/vendor.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Vendor Authentication')
@Controller('vendors/auth')
@Public()
export class VendorAuthController {
  private readonly logger = new Logger(VendorAuthController.name);

  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vendor login',
    description: 'Authenticate vendor user with email and password',
  })
  @ApiBody({ type: VendorLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: VendorAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid email or password' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account inactive',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Account is inactive' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async login(
    @Body() loginDto: VendorLoginDto,
  ): Promise<VendorAuthResponseDto> {
    this.logger.log(`Vendor login attempt for phone: ${loginDto.phone}`);
    return this.vendorAuthService.login(loginDto);
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP for vendor login',
    description:
      'Generate and send OTP to vendor phone number for authentication',
  })
  @ApiBody({ type: VendorSendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: VendorOtpResponseDto,
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
  @ApiResponse({
    status: 401,
    description: 'Vendor not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Vendor not found' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account inactive',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Account is inactive' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async sendOtp(
    @Body() sendOtpDto: VendorSendOtpDto,
  ): Promise<VendorOtpResponseDto> {
    this.logger.log(`Vendor OTP send attempt for phone: ${sendOtpDto.phone}`);
    return this.vendorAuthService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate vendor',
    description: 'Verify the OTP code and authenticate the vendor if valid',
  })
  @ApiBody({ type: VendorVerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, vendor authenticated',
    type: VendorAuthResponseDto,
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
    description: 'Invalid OTP or vendor not found',
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
    @Body() verifyOtpDto: VendorVerifyOtpDto,
  ): Promise<VendorAuthResponseDto> {
    this.logger.log(
      `Vendor OTP verification attempt for phone: ${verifyOtpDto.phone}`,
    );
    return this.vendorAuthService.verifyOtp(verifyOtpDto);
  }
}
