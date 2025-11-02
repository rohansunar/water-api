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
  VendorSignupDto,
  VendorLoginDto,
  VendorAuthResponseDto,
} from '../dtos/vendor.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Vendor Authentication')
@Controller('vendors/auth')
@Public()
export class VendorAuthController {
  private readonly logger = new Logger(VendorAuthController.name);

  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Vendor signup',
    description: 'Register a new vendor with business details',
  })
  @ApiBody({ type: VendorSignupDto })
  @ApiResponse({
    status: 201,
    description: 'Vendor registered successfully',
    type: VendorAuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Vendor with this email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Vendor with this email already exists',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async signup(
    @Body() signupDto: VendorSignupDto,
  ): Promise<VendorAuthResponseDto> {
    this.logger.log(
      `Vendor signup attempt for business: ${signupDto.businessName}, email: ${signupDto.email}`,
    );
    return this.vendorAuthService.signup(signupDto);
  }

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
    this.logger.log(`Vendor login attempt for email: ${loginDto.email}`);
    return this.vendorAuthService.login(loginDto);
  }
}
