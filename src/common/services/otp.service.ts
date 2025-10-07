import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OtpCode } from '@prisma/client';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface OtpRequest {
  phone: string;
  purpose: 'rider_login' | 'delivery_verification' | 'password_reset';
}

export interface OtpVerification {
  phone: string;
  otp: string;
  purpose: 'rider_login' | 'delivery_verification' | 'password_reset';
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly maxAttempts = 5;
  private readonly otpExpiryMinutes = 30;
  private readonly rateLimitWindowMs = 60 * 1000; // 1 minute
  private readonly maxRequestsPerWindow = 3;

  // Rate limiting store (in production, use Redis)
  private readonly rateLimitStore = new Map<
    string,
    { count: number; resetTime: Date }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate and store a new OTP for the given phone number and purpose
   */
  async generateOtp(
    request: OtpRequest,
  ): Promise<{ message: string; success: boolean }> {
    const { phone, purpose } = request;

    // Check rate limiting
    if (!this.checkRateLimit(phone)) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }

    // Check for existing valid OTP
    await this.validateExistingOtp(phone, purpose);

    // Generate and store OTP
    const otp = this.generateSecureOtp();
    const hashedOtp = this.hashOtp(otp);
    const expiresAt = this.calculateExpiryTime();

    await this.storeOtp(phone, purpose, hashedOtp, expiresAt);

    // Log OTP generation (in production, send via SMS)
    this.logger.log(`OTP generated for ${phone} (${purpose}): ${otp}`);

    return {
      message: 'OTP sent successfully to your phone number',
      success: true,
    };
  }

  /**
   * Verify OTP for the given phone number and purpose
   */
  async verifyOtp(
    verification: OtpVerification,
  ): Promise<{ valid: boolean; message: string }> {
    const { phone, otp, purpose } = verification;

    // Find and validate OTP record
    const otpRecord = await this.findOtpRecord(phone, purpose);
    await this.validateOtpRecord(otpRecord);

    // Verify OTP hash
    const isValid = await this.verifyOtpHash(otp, otpRecord.code);

    if (!isValid) {
      await this.handleFailedAttempt(otpRecord);
      const remainingAttempts = this.maxAttempts - (otpRecord.attempts + 1);
      throw new UnauthorizedException(
        `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      );
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
   * Validate existing OTP for phone and purpose
   */
  private async validateExistingOtp(
    phone: string,
    purpose: string,
  ): Promise<void> {
    const existingOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingOtp) {
      throw new ConflictException(
        'A valid OTP already exists for this phone number and purpose.',
      );
    }
  }

  /**
   * Calculate OTP expiry time
   */
  private calculateExpiryTime(): Date {
    return new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
  }

  /**
   * Store OTP in database
   */
  private async storeOtp(
    phone: string,
    purpose: string,
    hashedOtp: string,
    expiresAt: Date,
  ): Promise<void> {
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
   * Validate OTP record (expiry and attempts)
   */
  private async validateOtpRecord(otpRecord: any): Promise<void> {
    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      throw new UnauthorizedException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    // Check if too many attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      throw new UnauthorizedException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }
  }

  /**
   * Handle failed OTP attempt
   */
  private async handleFailedAttempt(otpRecord: any): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
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

  /**
   * Check rate limiting for OTP requests
   */
  private checkRateLimit(phone: string): boolean {
    const now = new Date();
    const record = this.rateLimitStore.get(phone);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(phone, {
        count: 1,
        resetTime: new Date(now.getTime() + this.rateLimitWindowMs),
      });
      return true;
    }

    if (record.count >= this.maxRequestsPerWindow) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clean up rate limit store (should be called periodically)
   */
  cleanupRateLimitStore(): void {
    const now = new Date();
    const entriesToDelete: string[] = [];

    this.rateLimitStore.forEach((record, phone) => {
      if (now > record.resetTime) {
        entriesToDelete.push(phone);
      }
    });

    entriesToDelete.forEach((phone) => {
      this.rateLimitStore.delete(phone);
    });
  }
}
