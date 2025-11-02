import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CustomerService } from '../../customer/services/customer.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  LoginDto,
  VerifyOtpDto,
  AuthResponseDto,
  UserProfileDto,
  CustomerProfileDto,
} from '../../common/dto/auth.dto';
import {
  Customer,
  CustomerRole,
} from '../../customer/interfaces/customer.interface';
import { CreateCustomerDto } from '../../common/dto/customer.dto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<
    string,
    { otp: string; expiresAt: Date; attempts: number }
  >();
  private readonly maxOtpStoreSize = 10000; // Limit OTP store size to prevent memory bloat
  private cleanupInterval!: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customerService: CustomerService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  onModuleInit() {
    // Schedule periodic cleanup of expired OTPs every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredOtps();
      },
      5 * 60 * 1000,
    );
    this.logger.log('OTP cleanup scheduler initialized');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('OTP cleanup scheduler destroyed');
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ message: string; success: boolean }> {
    const startTime = Date.now();
    try {
      const { phone } = loginDto;
      this.customLogger.logSecurityEvent(
        'login_attempt',
        { phone },
        undefined,
        undefined,
      );

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      this.storeOtp(phone, otp, expiresAt);
      this.logOtpGeneration(phone, otp);

      this.customLogger.logSecurityEvent(
        'login_success',
        { phone },
        undefined,
        undefined,
      );
      return {
        message: 'OTP sent successfully to your phone number',
        success: true,
      };
    } catch (error) {
      this.customLogger.logSecurityEvent(
        'login_failure',
        { phone: loginDto.phone, error: error.message },
        undefined,
        undefined,
      );
      this.logger.error(`Login failed for phone ${loginDto.phone}:`, error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  private storeOtp(phone: string, otp: string, expiresAt: Date): void {
    // Maintain OTP store size limit
    if (this.otpStore.size >= this.maxOtpStoreSize) {
      // Remove 10% of oldest entries when limit is reached
      const entriesToRemove = Math.ceil(this.maxOtpStoreSize * 0.1);
      const keysToRemove = Array.from(this.otpStore.keys()).slice(0, entriesToRemove);
      keysToRemove.forEach(key => this.otpStore.delete(key));
    }

    // Store OTP with expiration and attempt tracking
    this.otpStore.set(phone, { otp, expiresAt, attempts: 0 });
  }

  private logOtpGeneration(phone: string, otp: string): void {
    // In production, send OTP via SMS service
    this.logger.log(`OTP for ${phone}: ${otp}`);

    // For development, we'll log the OTP
    this.logger.debug(`OTP generated for ${phone}: ${otp}`);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    const startTime = Date.now();
    try {
      const { phone, otp } = verifyOtpDto;
      this.customLogger.logSecurityEvent(
        'otp_verification_attempt',
        { phone },
        undefined,
        undefined,
      );

      this.validateOtp(phone, otp);

      const customer = await this.findOrCreateCustomer(phone);
      const token = this.generateToken(customer);

      this.customLogger.logSecurityEvent(
        'otp_verification_success',
        { phone, customerId: (customer as any)._id },
        undefined,
        undefined,
      );
      this.customLogger.logBusinessEvent(
        'customer_authenticated',
        { customerId: (customer as any)._id, phone },
        (customer as any)._id,
      );

      const customerProfile = await this.buildCustomerProfile(customer);

      return this.buildAuthResponse(token, customerProfile, null);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.customLogger.logSecurityEvent(
          'otp_verification_failure',
          { phone: verifyOtpDto.phone, reason: error.message },
          undefined,
          undefined,
        );
        throw error;
      }
      this.customLogger.logSecurityEvent(
        'otp_verification_error',
        { phone: verifyOtpDto.phone, error: error.message },
        undefined,
        undefined,
      );
      this.logger.error(
        `OTP verification failed for phone ${verifyOtpDto.phone}:`,
        error,
      );
      throw new BadRequestException(
        'OTP verification failed. Please try again.',
      );
    }
  }

  private validateOtp(phone: string, otp: string): void {
    const storedOtpData = this.otpStore.get(phone);

    if (!storedOtpData) {
      throw new UnauthorizedException(
        'OTP not found. Please request a new OTP.',
      );
    }

    // Check if OTP has expired
    if (new Date() > storedOtpData.expiresAt) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    // Check attempt limit
    if (storedOtpData.attempts >= 3) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts++;
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    // OTP verified successfully, remove from store
    this.otpStore.delete(phone);
  }

  private async findOrCreateCustomer(phone: string): Promise<any> {
    const startTime = Date.now();
    try {
      let customer = await this.customerService.findByPhone(phone);
      if (!customer) {
        const createCustomerDto: CreateCustomerDto = {
          phone,
          role: CustomerRole.CUSTOMER,
          isActive: true,
          walletBalance: 0,
        };
        customer = await this.customerService.create(createCustomerDto);
        this.customLogger.logDatabaseOperation(
          'create',
          'customers',
          Date.now() - startTime,
          true,
        );
      } else {
        this.customLogger.logDatabaseOperation(
          'find',
          'customers',
          Date.now() - startTime,
          true,
        );
      }
      return customer as any;
    } catch (error) {
      this.customLogger.logDatabaseOperation(
        'findOrCreate',
        'customers',
        Date.now() - startTime,
        false,
        error,
      );
      throw error;
    }
  }


  private generateToken(customer: any): string {
    // Generate JWT token using customer data
    const payload = {
      sub: customer._id.toString(),
      phone: customer.phone,
      role: customer.role,
    };
    return this.jwtService.sign(payload);
  }

  private async buildCustomerProfile(
    customer: any,
  ): Promise<CustomerProfileDto> {
    const customerProfile = await this.customerService.getCustomerProfile(
      customer._id.toString(),
    );

    // Convert to auth DTO format (new customer format)
    return {
      id: customerProfile.id,
      phone: customerProfile.phone,
      name: customerProfile.name,
      email: customerProfile.email,
      role: customerProfile.role,
      walletBalance: customerProfile.walletBalance,
      isActive: customerProfile.isActive,
      monthlyPaymentMode: customerProfile.monthlyPaymentMode,
      addresses: customerProfile.addresses,
      createdAt: customerProfile.createdAt,
    };
  }


  private buildAuthResponse(
    token: string,
    customerProfile: CustomerProfileDto,
    userProfile: UserProfileDto,
  ): AuthResponseDto {
    return {
      token,
      customer: customerProfile,
      user: userProfile, // Legacy property for backward compatibility
    };
  }


  private generateOTP(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Cleanup expired OTPs periodically with enhanced logging and size management
  private cleanupExpiredOtps(): void {
    const now = new Date();
    let cleanedCount = 0;
    const initialSize = this.otpStore.size;

    for (const [phone, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phone);
        cleanedCount++;
      }
    }

    // Additional cleanup: remove oldest entries if store is still too large
    if (this.otpStore.size >= this.maxOtpStoreSize) {
      const entriesToRemove = Math.ceil(this.maxOtpStoreSize * 0.2); // Remove 20% more
      const keysToRemove = Array.from(this.otpStore.keys()).slice(0, entriesToRemove);
      keysToRemove.forEach(key => this.otpStore.delete(key));
      cleanedCount += keysToRemove.length;
    }

    if (cleanedCount > 0) {
      this.logger.log(`OTP cleanup: removed ${cleanedCount} entries (${initialSize} → ${this.otpStore.size})`);
    }
  }
}
