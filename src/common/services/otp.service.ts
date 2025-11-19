import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface OtpRequest {
  phone: string;
  purpose:
    | 'rider_login'
    | 'customer_login'
    | 'delivery_verification'
    | 'password_reset'
    | 'vendor_login';
}

export interface OtpVerification {
  phone: string;
  otp: string;
  purpose:
    | 'rider_login'
    | 'customer_login'
    | 'delivery_verification'
    | 'password_reset'
    | 'vendor_login';
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpExpiryMinutes = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate and store a new OTP for the given phone number and purpose
   */
  async generateOtp(
    request: OtpRequest,
  ): Promise<{ message: string; success: boolean; otp?: string }> {
    const { phone, purpose } = request;

    // Check if in test mode (environment variable)
    const isTestMode = this.configService.get('NODE_ENV') === 'development';

    const otp = isTestMode ? '123456' : this.generateSecureOtp();

    const hashedOtp = this.hashOtp(otp);
    const expiresAt = this.calculateExpiryTime();

    // Check if a record with this phone and purpose already exists
    const existingOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
      },
    });

    if (existingOtp) {
      // Update existing record
      await this.prisma.otpCode.update({
        where: { id: existingOtp.id },
        data: {
          code: hashedOtp,
          expiresAt,
          attempts: 0,
          isUsed: false,
          usedAt: null,
        },
      });
    } else {
      // Create new record
      await this.prisma.otpCode.create({
        data: {
          phone,
          code: hashedOtp,
          purpose,
          expiresAt,
          attempts: 0,
          isUsed: false,
        },
      });
    }

    // Log OTP generation (in production, send via SMS)
    this.logger.log(`OTP generated for ${phone} (${purpose}): ${otp}`);

    const response: { message: string; success: boolean; otp?: string } = {
      message: 'OTP sent successfully to your phone number',
      success: true,
    };

    if (isTestMode) {
      response.otp = otp;
    }

    return response;
  }

  /**
   * Verify OTP for the given phone number and purpose
   */
  async verifyOtp(
    verification: OtpVerification,
  ): Promise<{ valid: boolean; message: string }> {
    const { phone, otp, purpose } = verification;

    // Find OTP record
    const otpRecord = await this.findOtpRecord(phone, purpose);

    // Verify OTP hash
    const isValid = await this.verifyOtpHash(otp, otpRecord.code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used
    await this.markOtpAsUsed(otpRecord);

    this.logger.log(`OTP verified successfully for ${phone} (${purpose})`);

    return {
      valid: true,
      message: 'OTP verified successfully',
    };
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otpCode.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired/used OTP records`);
    }

    return result.count;
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOtpStats(): Promise<{
    totalOtps: number;
    activeOtps: number;
    expiredOtps: number;
    usedOtps: number;
  }> {
    const [totalOtps, activeOtps, expiredOtps, usedOtps] = await Promise.all([
      this.prisma.otpCode.count(),
      this.prisma.otpCode.count({
        where: {
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.otpCode.count({
        where: {
          expiresAt: { lt: new Date() },
        },
      }),
      this.prisma.otpCode.count({
        where: {
          isUsed: true,
        },
      }),
    ]);

    return {
      totalOtps,
      activeOtps,
      expiredOtps,
      usedOtps,
    };
  }

  /**
   * Calculate OTP expiry time
   */
  private calculateExpiryTime(): Date {
    return new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
  }

  /**
   * Generate cryptographically secure 6-digit OTP
   */
  private generateSecureOtp(): string {
    // Use crypto.randomInt for better randomness
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
  }

  /**
   * Hash OTP using SHA-256 with salt
   */
  private hashOtp(otp: string): string {
    const salt = this.configService.get(
      'OTP_SALT',
      'default-salt-change-in-production',
    );
    return crypto
      .createHash('sha256')
      .update(otp + salt)
      .digest('hex');
  }

  /**
   * Find OTP record
   */
  private async findOtpRecord(phone: string, purpose: string): Promise<any> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        isUsed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException(
        'OTP not found. Please request a new OTP.',
      );
    }

    return otpRecord;
  }

  /**
   * Mark OTP as used
   */
  private async markOtpAsUsed(otpRecord: any): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Verify OTP hash
   */
  private async verifyOtpHash(
    plainOtp: string,
    hashedOtp: string,
  ): Promise<boolean> {
    const expectedHash = this.hashOtp(plainOtp);
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(hashedOtp, 'hex'),
    );
  }
}
