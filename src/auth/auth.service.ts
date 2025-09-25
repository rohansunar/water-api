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
import { UserService } from '../modules/user/services/user.service';
import { CustomerService } from '../customer/customer.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import {
  LoginDto,
  VerifyOtpDto,
  AuthResponseDto,
  UserProfileDto,
  CustomerProfileDto,
} from '../common/dto/auth.dto';
import { User, UserRole } from '../modules/user/entities/user.entity';
import {
  Customer,
  CustomerRole,
} from '../common/interfaces/customer.interface';
import { CreateUserDto } from '../modules/user/dto/user.dto';
import { CreateCustomerDto } from '../common/dto/customer.dto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<
    string,
    { otp: string; expiresAt: Date; attempts: number }
  >();
  private cleanupInterval!: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
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
      this.customLogger.logSecurityEvent('login_attempt', { phone }, undefined, undefined);

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      this.storeOtp(phone, otp, expiresAt);
      this.logOtpGeneration(phone, otp);

      this.customLogger.logSecurityEvent('login_success', { phone }, undefined, undefined);
      return {
        message: 'OTP sent successfully to your phone number',
        success: true,
      };
    } catch (error) {
      this.customLogger.logSecurityEvent('login_failure', { phone: loginDto.phone, error: error.message }, undefined, undefined);
      this.logger.error(`Login failed for phone ${loginDto.phone}:`, error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }


  private storeOtp(phone: string, otp: string, expiresAt: Date): void {
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
      this.customLogger.logSecurityEvent('otp_verification_attempt', { phone }, undefined, undefined);

      this.validateOtp(phone, otp);

      const customer = await this.findOrCreateCustomer(phone);
      const user = await this.findOrCreateUser(phone);
      const token = this.generateToken(customer);

      this.customLogger.logSecurityEvent('otp_verification_success', { phone, customerId: (customer as any)._id }, undefined, undefined);
      this.customLogger.logBusinessEvent('customer_authenticated', { customerId: (customer as any)._id, phone }, (customer as any)._id);

      const customerProfile = await this.buildCustomerProfile(customer);
      const userProfile = await this.buildUserProfile(user);

      return this.buildAuthResponse(token, customerProfile, userProfile);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.customLogger.logSecurityEvent('otp_verification_failure', { phone: verifyOtpDto.phone, reason: error.message }, undefined, undefined);
        throw error;
      }
      this.customLogger.logSecurityEvent('otp_verification_error', { phone: verifyOtpDto.phone, error: error.message }, undefined, undefined);
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
        this.customLogger.logDatabaseOperation('create', 'customers', Date.now() - startTime, true);
      } else {
        this.customLogger.logDatabaseOperation('find', 'customers', Date.now() - startTime, true);
      }
      return customer as any;
    } catch (error) {
      this.customLogger.logDatabaseOperation('findOrCreate', 'customers', Date.now() - startTime, false, error);
      throw error;
    }
  }

  private async findOrCreateUser(phone: string): Promise<User> {
    const startTime = Date.now();
    try {
      // Legacy: Also maintain user service compatibility
      let user = await this.userService.findByPhoneDocument(phone);
      if (!user) {
        const createUserDto: CreateUserDto = {
          phone,
          role: UserRole.CUSTOMER,
          isActive: true,
          walletBalance: 0,
        };
        user = await this.userService.create(createUserDto);
        this.customLogger.logDatabaseOperation('create', 'users', Date.now() - startTime, true);
      } else {
        this.customLogger.logDatabaseOperation('find', 'users', Date.now() - startTime, true);
      }
      return user;
    } catch (error) {
      this.customLogger.logDatabaseOperation('findOrCreate', 'users', Date.now() - startTime, false, error);
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

  private async buildCustomerProfile(customer: any): Promise<CustomerProfileDto> {
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

  private async buildUserProfile(user: any): Promise<UserProfileDto> {
    const userProfile = await this.userService.getUserProfile(user.id);

    // Legacy user profile for backward compatibility
    return {
      id: userProfile.id,
      phone: userProfile.phone,
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      walletBalance: userProfile.walletBalance,
      isActive: userProfile.isActive,
      monthlyPaymentMode: userProfile.monthlyPaymentMode,
      addresses: userProfile.addresses.map((addr) => ({
        id: addr.id || '',
        type: addr.label || 'home', // Use label as type since type doesn't exist
        street: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        landmark: addr.landmark,
        latitude: addr.latitude || 0,
        longitude: addr.longitude || 0,
        isDefault: addr.isDefault || false,
      })),
      createdAt: userProfile.createdAt,
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

  async validateUser(userId: string): Promise<User> {
    const startTime = Date.now();
    try {
      const user = await this.userService.findById(userId);
      this.customLogger.logDatabaseOperation('find', 'users', Date.now() - startTime, true);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      // UserData already has the id property
      return user as unknown as User;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.customLogger.logDatabaseOperation('find', 'users', Date.now() - startTime, false, error);
      throw error;
    }
  }

  private generateOTP(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Cleanup expired OTPs periodically
  private cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [phone, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phone);
      }
    }
  }
}
