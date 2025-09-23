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
import {
  LoginDto,
  VerifyOtpDto,
  AuthResponseDto,
  UserProfileDto,
} from '../common/dto/auth.dto';
import { User, UserRole } from '../modules/user/entities/user.entity';
import { CreateUserDto } from '../modules/user/dto/user.dto';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<
    string,
    { otp: string; expiresAt: Date; attempts: number }
  >();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
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
    try {
      const { phone } = loginDto;

      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP with expiration and attempt tracking
      this.otpStore.set(phone, { otp, expiresAt, attempts: 0 });

      // In production, send OTP via SMS service
      this.logger.log(`OTP for ${phone}: ${otp}`);

      // For development, we'll log the OTP
      console.log(`🔐 OTP for ${phone}: ${otp}`);

      return {
        message: 'OTP sent successfully to your phone number',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Login failed for phone ${loginDto.phone}:`, error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    try {
      const { phone, otp } = verifyOtpDto;

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

      // Find or create user
      let user = await this.userService.findByPhoneDocument(phone);
      if (!user) {
        const createUserDto: CreateUserDto = {
          phone,
          role: UserRole.CUSTOMER,
          isActive: true,
          walletBalance: 0,
        };
        user = await this.userService.create(createUserDto);
      }

      // Generate JWT token
      const payload = { sub: user.id, phone: user.phone, role: user.role };
      const token = this.jwtService.sign(payload);

      this.logger.log(`User ${user.id} authenticated successfully`);

      const userProfile = await this.userService.getUserProfile(user.id);

      // Convert to auth DTO format
      const authUserProfile: UserProfileDto = {
        id: userProfile.id,
        phone: userProfile.phone,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        walletBalance: userProfile.walletBalance,
        isActive: userProfile.isActive,
        monthlyPaymentMode: userProfile.monthlyPaymentMode,
        addresses: userProfile.addresses.map(addr => ({
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

      return {
        token,
        user: authUserProfile,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `OTP verification failed for phone ${verifyOtpDto.phone}:`,
        error,
      );
      throw new BadRequestException(
        'OTP verification failed. Please try again.',
      );
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    // UserData already has the id property
    return user as unknown as User;
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
