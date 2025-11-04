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
}
