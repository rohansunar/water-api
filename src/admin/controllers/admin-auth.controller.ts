import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto, AdminAuthResponseDto } from '../dto/admin.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
@Public()
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin user with email and password',
  })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AdminAuthResponseDto,
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
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    this.logger.log(`Admin login attempt for email: ${loginDto.email}`);
    return this.adminAuthService.login(loginDto);
  }
}
