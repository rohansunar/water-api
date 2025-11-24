import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerService } from './customer.service';
import { OtpService } from '../../common/services/otp.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import {
  CustomerLoginDto,
  CustomerSendOtpDto,
  CustomerVerifyOtpDto,
  CustomerAuthResponseDto,
  CustomerOtpResponseDto,
} from '../dto/customer-auth.dto';
import { CustomerRole } from '../interfaces/customer.interface';

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly customerService: CustomerService,
    private readonly otpService: OtpService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  /**
   * Initiate customer login by sending OTP
   */
  async login(
    loginDto: CustomerLoginDto,
  ): Promise<{ message: string; success: boolean }> {
    const { phone } = loginDto;
    this.logger.log(`Customer login attempt for phone: ${phone}`);

    this.customLogger.logSecurityEvent(
      'customer_login_attempt',
      { phone },
      undefined,
      undefined,
    );

    try {
      const result = await this.otpService.generateOtp({
        phone,
        purpose: 'customer_login',
      });

      this.customLogger.logSecurityEvent(
        'customer_login_success',
        { phone },
        undefined,
        undefined,
      );

      return result;
    } catch (error) {
      this.customLogger.logSecurityEvent(
        'customer_login_failure',
        { phone, error: error.message },
        undefined,
        undefined,
      );
      throw error;
    }
  }

  /**
   * Send OTP for customer authentication
   */
  async sendOtp(sendOtpDto: CustomerSendOtpDto): Promise<CustomerOtpResponseDto> {
    const { phone } = sendOtpDto;
    this.logger.log(`Customer OTP send attempt for phone: ${phone}`);

    this.customLogger.logSecurityEvent(
      'customer_otp_send_attempt',
      { phone },
      undefined,
      undefined,
    );

    try {
      const result = await this.otpService.generateOtp({
        phone,
        purpose: 'customer_login',
      });

      this.customLogger.logSecurityEvent(
        'customer_otp_send_success',
        { phone },
        undefined,
        undefined,
      );

      return {
        success: result.success,
        message: result.message,
        expiresIn: 1800, // 30 minutes in seconds
      };
    } catch (error) {
      this.customLogger.logSecurityEvent(
        'customer_otp_send_failure',
        { phone, error: error.message },
        undefined,
        undefined,
      );
      throw error;
    }
  }

  /**
   * Verify OTP and authenticate customer
   */
  async verifyOtp(
    verifyOtpDto: CustomerVerifyOtpDto,
  ): Promise<CustomerAuthResponseDto> {
    const { phone, otp } = verifyOtpDto;
    this.logger.log(`Customer OTP verification for phone: ${phone}`);

    this.customLogger.logSecurityEvent(
      'customer_otp_verification_attempt',
      { phone },
      undefined,
      undefined,
    );

    try {
      // Verify OTP
      const otpResult = await this.otpService.verifyOtp({
        phone,
        otp,
        purpose: 'customer_login',
      });

      if (!otpResult.valid) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // Find or create customer
      const customer = await this.findOrCreateCustomer(phone);

      // Generate JWT token
      const token = this.generateToken(customer);

      // Get customer profile
      const customerProfile = await this.customerService.getCustomerProfile(
        customer.id.toString(),
      );

      this.customLogger.logSecurityEvent(
        'customer_otp_verification_success',
        { phone, customerId: customer._id },
        customer._id,
        undefined,
      );

      this.customLogger.logBusinessEvent(
        'customer_authenticated',
        { customerId: customer._id, phone },
        customer._id,
      );

      return {
        token,
        customer: customerProfile,
        expiresIn: 3600 * 24 * 7, // 7 days in seconds
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.customLogger.logSecurityEvent(
          'customer_otp_verification_failure',
          { phone, reason: error.message },
          undefined,
          undefined,
        );
      } else {
        this.customLogger.logSecurityEvent(
          'customer_otp_verification_error',
          { phone, error: error.message },
          undefined,
          undefined,
        );
      }
      throw error;
    }
  }

  /**
   * Find existing customer or create new one
   */
  private async findOrCreateCustomer(phone: string): Promise<any> {
    let customer = await this.customerService.findByPhone(phone);

    if (!customer) {
      const createCustomerDto = {
        phone,
        role: CustomerRole.CUSTOMER,
        isActive: true,
        walletBalance: 0,
      };
      customer = await this.customerService.create(createCustomerDto);
      this.logger.log(`New customer created: ${customer.id}`);
    }

    return customer;
  }

  /**
   * Generate JWT token for customer
   */
  private generateToken(customer: any): string {
    const payload = {
      sub: customer.id.toString(),
      phone: customer.phone,
      role: customer.role,
      type: 'customer',
    };

    return this.jwtService.sign(payload, {
      expiresIn: '7d', // Token expires in 7 days
    });
  }

  /**
   * Validate customer token
   */
  async validateCustomer(userId: string): Promise<boolean> {
    const customer = await this.customerService.findById(userId);
    return !!(customer && customer.isActive);
  }

  /**
   * Get customer profile for authenticated user
   */
  async getCustomerProfile(userId: string): Promise<any> {
    return this.customerService.getCustomerProfile(userId);
  }
}
