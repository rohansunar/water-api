import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Logger,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RiderAuthService } from '../services/rider-auth.service';
import { OtpService } from '../../common/services/otp.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../common/interfaces/user.interface';
import { DeliveryRiderResponseDto } from '../dto/rider.dto';

export interface LoginRequestDto {
  phone: string;
}

export interface OtpVerificationDto {
  phone: string;
  otp: string;
}

export interface AuthResponseDto {
  token: string;
  rider: DeliveryRiderResponseDto;
  message: string;
}

@ApiTags('Rider Authentication')
@Controller('riders/auth')
export class RiderAuthController {
  private readonly logger = new Logger(RiderAuthController.name);

  constructor(
    private readonly riderAuthService: RiderAuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate rider login with phone number',
    description:
      'Send OTP to the provided phone number for rider authentication',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          example: '+919876543210',
          description: 'Rider phone number',
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
    description: 'Invalid phone number or too many requests',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many OTP requests. Please try again later.',
  })
  async login(@Body() loginDto: LoginRequestDto) {
    this.logger.log(`Rider login attempt for phone: ${loginDto.phone}`);

    return this.otpService.generateOtp({
      phone: loginDto.phone,
      purpose: 'rider_login',
    });
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and complete rider authentication',
    description: 'Verify the OTP sent to the phone number and return JWT token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          example: '+919876543210',
          description: 'Rider phone number',
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
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'JWT authentication token',
        },
        rider: {
          type: 'object',
          description: 'Rider profile information',
        },
        message: {
          type: 'string',
          example: 'Authentication successful',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or phone number',
  })
  @ApiResponse({
    status: 401,
    description: 'OTP expired or invalid',
  })
  async verifyOtp(@Body() verifyDto: OtpVerificationDto) {
    this.logger.log(`Rider OTP verification for phone: ${verifyDto.phone}`);

    // Verify OTP
    const otpResult = await this.otpService.verifyOtp({
      phone: verifyDto.phone,
      otp: verifyDto.otp,
      purpose: 'rider_login',
    });

    if (!otpResult.valid) {
      throw new Error('Invalid OTP verification');
    }

    // Authenticate rider and generate token
    return this.riderAuthService.authenticateRider(verifyDto.phone);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current rider profile',
    description: 'Retrieve the profile information of the authenticated rider',
  })
  @ApiResponse({
    status: 200,
    description: 'Rider profile retrieved successfully',
    type: DeliveryRiderResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Rider profile not found',
  })
  async getProfile(
    @CurrentUser() user: User,
  ): Promise<DeliveryRiderResponseDto> {
    this.logger.log(`Getting profile for rider user: ${user.id}`);
    return this.riderAuthService.getRiderProfile(user.id);
  }
}
