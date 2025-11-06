import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { OtpService } from '../../common/services/otp.service';
import {
  VendorAuthResponseDto,
  VendorProfileDto,
  VendorSendOtpDto,
  VendorVerifyOtpDto,
  VendorOtpResponseDto,
} from '../dto/vendor.dto';

@Injectable()
export class VendorAuthService {
  private readonly logger = new Logger(VendorAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customLogger: CustomLoggerService,
    private readonly prismaService: PrismaService,
    private readonly otpService: OtpService,
  ) {}


  async validateVendor(vendorId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const vendor = await this.prismaService.vendor.findUnique({
        where: { id: BigInt(vendorId) },
      });
      this.customLogger.logDatabaseOperation(
        'find',
        'vendors',
        Date.now() - startTime,
        !!vendor,
      );

      if (!vendor || !vendor.isActive) {
        this.customLogger.logSecurityEvent(
          'vendor_validation_failure',
          { vendorId, reason: 'vendor_not_found_or_inactive' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Vendor not found or inactive');
      }

      return vendor;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logDatabaseOperation(
        'find',
        'vendors',
        Date.now() - startTime,
        false,
        error,
      );
      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async sendOtp(sendOtpDto: VendorSendOtpDto): Promise<VendorOtpResponseDto> {
    const startTime = Date.now();
    try {
      const { phone } = sendOtpDto;

      // Log OTP send attempt
      this.customLogger.logSecurityEvent(
        'vendor_otp_send_attempt',
        { phone },
        undefined,
        undefined,
      );

      // Generate and send OTP
      const otpResult = await this.otpService.generateOtp({
        phone,
        purpose: 'vendor_login',
      });

      this.customLogger.logSecurityEvent(
        'vendor_otp_send_success',
        { phone },
        undefined,
      );

      return {
        success: otpResult.success,
        message: otpResult.message,
        expiresIn: 30, // 30 minutes
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.customLogger.logSecurityEvent(
        'vendor_otp_send_error',
        { phone: sendOtpDto.phone, error: error.message },
        undefined,
        undefined,
      );
      this.logger.error(
        `Vendor OTP send failed for ${sendOtpDto.phone}:`,
        error,
      );
      throw new UnauthorizedException('Failed to send OTP');
    }
  }

  async verifyOtp(
    verifyOtpDto: VendorVerifyOtpDto,
  ): Promise<VendorAuthResponseDto> {
    const startTime = Date.now();
    try {
      const { phone, otp } = verifyOtpDto;

      // Log OTP verification attempt
      this.customLogger.logSecurityEvent(
        'vendor_otp_verify_attempt',
        { phone },
        undefined,
        undefined,
      );

      // Verify OTP
      const otpResult = await this.otpService.verifyOtp({
        phone,
        otp,
        purpose: 'vendor_login',
      });

      if (!otpResult.valid) {
        this.customLogger.logSecurityEvent(
          'vendor_otp_verify_failure',
          { phone, reason: 'invalid_otp' },
          undefined,
          undefined,
        );
        throw new UnauthorizedException('Invalid OTP');
      }

      // After successful OTP verification, upsert vendor
      const upsertStartTime = Date.now();
      const vendor = await this.prismaService.vendor.upsert({
        where: { phone },
        update: {
          lastActiveAt: new Date(),
        },
        create: {
          phone,
          name: phone, // Use phone as default name for OTP-based registration
          isVerified: true,
          lastActiveAt: new Date(),
        },
      });
      this.customLogger.logDatabaseOperation(
        'upsert',
        'vendors',
        Date.now() - upsertStartTime,
        true,
      );

      // Generate JWT token
      const payload = {
        sub: vendor.id.toString(),
        phone: vendor.phone,
        role: 'vendor',
        businessName: vendor.name,
      };

      const token = this.jwtService.sign(payload);
      const expiresIn = 36000; // 10 hour

      this.customLogger.logBusinessEvent(
        'vendor_authenticated_via_otp',
        { vendorId: vendor.id.toString(), phone },
        vendor.id.toString(),
      );

      return {
        token,
        vendor: this.mapToProfileDto(vendor),
        expiresIn,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logSecurityEvent(
        'vendor_otp_verify_error',
        { phone: verifyOtpDto.phone, error: error.message },
        undefined,
        undefined,
      );
      this.logger.error(
        `Vendor OTP verification failed for ${verifyOtpDto.phone}:`,
        error,
      );
      throw new UnauthorizedException('OTP verification failed');
    }
  }

  private mapToProfileDto(vendor: any): VendorProfileDto {
    return {
      id: vendor.id.toString(),
      businessName: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: '', // Address is stored in VendorAddress table, not directly on Vendor
      isActive: vendor.isActive,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
