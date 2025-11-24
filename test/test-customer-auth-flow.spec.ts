import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { CustomerAuthService } from '../src/customer/services/customer-auth.service';
import { CustomerService } from '../src/customer/services/customer.service';
import { OtpService } from '../src/common/services/otp.service';
import { CustomLoggerService } from '../src/common/logger/logger.service';
import { CustomerAuthController } from '../src/customer/controllers/customer-auth.controller';
import {
  CustomerSendOtpDto,
  CustomerVerifyOtpDto,
  CustomerOtpResponseDto,
  CustomerAuthResponseDto,
} from '../src/customer/dto/customer-auth.dto';
import { CustomerRole } from '../src/customer/interfaces/customer.interface';

// Mock services
jest.mock('../src/customer/services/customer.service');
jest.mock('../src/common/services/otp.service');
jest.mock('../src/common/logger/logger.service');
jest.mock('@nestjs/jwt');

describe('CustomerAuthService - OTP Flow', () => {
  let service: CustomerAuthService;
  let customerService: jest.Mocked<CustomerService>;
  let otpService: jest.Mocked<OtpService>;
  let jwtService: jest.Mocked<JwtService>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        CustomerService,
        OtpService,
        JwtService,
        CustomLoggerService,
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
    customerService = module.get(CustomerService);
    otpService = module.get(OtpService);
    jwtService = module.get(JwtService);
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    const validPhone = '+919876543210';
    const sendOtpDto: CustomerSendOtpDto = { phone: validPhone };

    it('should successfully send OTP for valid phone number', async () => {
      const mockOtpResult = {
        success: true,
        message: 'OTP sent successfully to your phone number',
      };

      otpService.generateOtp.mockResolvedValue(mockOtpResult);

      const result = await service.sendOtp(sendOtpDto);

      expect(result).toEqual({
        success: true,
        message: 'OTP sent successfully to your phone number',
        expiresIn: 1800,
      });
      expect(otpService.generateOtp).toHaveBeenCalledWith({
        phone: validPhone,
        purpose: 'customer_login',
      });
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_attempt',
        { phone: validPhone },
        undefined,
        undefined,
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_success',
        { phone: validPhone },
        undefined,
        undefined,
      );
    });

    it('should handle OTP service failure and log error', async () => {
      const error = new BadRequestException('Rate limit exceeded');
      otpService.generateOtp.mockRejectedValue(error);

      await expect(service.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_attempt',
        { phone: validPhone },
        undefined,
        undefined,
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_failure',
        { phone: validPhone, error: error.message },
        undefined,
        undefined,
      );
    });

    it('should handle invalid phone number validation', async () => {
      const invalidDto: CustomerSendOtpDto = { phone: 'invalid-phone' };

      const error = new BadRequestException('Invalid phone number');
      otpService.generateOtp.mockRejectedValue(error);

      await expect(service.sendOtp(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyOtp', () => {
    const validPhone = '+919876543210';
    const validOtp = '123456';
    const verifyOtpDto: CustomerVerifyOtpDto = {
      phone: validPhone,
      otp: validOtp,
    };

    const mockCustomer = {
      _id: 'customer123',
      phone: validPhone,
      role: CustomerRole.CUSTOMER,
      isActive: true,
      walletBalance: 0,
    };

    const mockCustomerProfile = {
      id: 'customer123',
      phone: validPhone,
      role: CustomerRole.CUSTOMER,
      walletBalance: 0,
      isActive: true,
      monthlyPaymentMode: false,
      addresses: [],
      createdAt: new Date(),
    };

    beforeEach(() => {
      jwtService.sign.mockReturnValue('mock-jwt-token');
      customerService.getCustomerProfile.mockResolvedValue(mockCustomerProfile);
    });

    it('should successfully verify OTP and create new customer', async () => {
      // OTP verification succeeds
      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });

      // Customer doesn't exist, so create new one
      customerService.findByPhone.mockResolvedValue(null);
      customerService.create.mockResolvedValue(mockCustomer);

      const result = await service.verifyOtp(verifyOtpDto);

      expect(result).toEqual({
        token: 'mock-jwt-token',
        customer: mockCustomerProfile,
        expiresIn: 3600 * 24 * 7,
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        phone: validPhone,
        otp: validOtp,
        purpose: 'customer_login',
      });
      expect(customerService.findByPhone).toHaveBeenCalledWith(validPhone);
      expect(customerService.create).toHaveBeenCalledWith({
        phone: validPhone,
        role: CustomerRole.CUSTOMER,
        isActive: true,
        walletBalance: 0,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'customer123',
          phone: validPhone,
          role: CustomerRole.CUSTOMER,
          type: 'customer',
        },
        {
          expiresIn: '7d',
        },
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'customer_authenticated',
        { customerId: 'customer123', phone: validPhone },
        'customer123',
      );
    });

    it('should successfully verify OTP for existing customer', async () => {
      // OTP verification succeeds
      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });

      // Customer exists
      customerService.findByPhone.mockResolvedValue(mockCustomer);

      const result = await service.verifyOtp(verifyOtpDto);

      expect(result).toEqual({
        token: 'mock-jwt-token',
        customer: mockCustomerProfile,
        expiresIn: 3600 * 24 * 7,
      });

      expect(customerService.create).not.toHaveBeenCalled();
      expect(customerService.findByPhone).toHaveBeenCalledWith(validPhone);
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      otpService.verifyOtp.mockResolvedValue({ valid: false, message: 'Invalid OTP' });

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_verification_failure',
        { phone: validPhone, reason: 'Invalid OTP' },
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      const expiredError = new UnauthorizedException('OTP expired');
      otpService.verifyOtp.mockRejectedValue(expiredError);

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_verification_failure',
        { phone: validPhone, reason: expiredError.message },
        undefined,
        undefined,
      );
    });

    it('should handle customer creation failure', async () => {
      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });
      customerService.findByPhone.mockResolvedValue(null);
      customerService.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow();

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_verification_error',
        { phone: validPhone, error: 'Database connection failed' },
        undefined,
        undefined,
      );
    });

    it('should handle invalid OTP format', async () => {
      const invalidOtpDto: CustomerVerifyOtpDto = {
        phone: validPhone,
        otp: 'invalid',
      };

      const error = new BadRequestException('OTP must be exactly 6 digits');
      otpService.verifyOtp.mockRejectedValue(error);

      await expect(service.verifyOtp(invalidOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCustomer', () => {
    it('should return true for active customer', async () => {
      const customer = { _id: '123', isActive: true };
      customerService.findById.mockResolvedValue(customer as any);

      const result = await service.validateCustomer('123');

      expect(result).toBe(true);
      expect(customerService.findById).toHaveBeenCalledWith('123');
    });

    it('should return false for inactive customer', async () => {
      const customer = { _id: '123', isActive: false };
      customerService.findById.mockResolvedValue(customer as any);

      const result = await service.validateCustomer('123');

      expect(result).toBe(false);
    });

    it('should return false for non-existent customer', async () => {
      customerService.findById.mockResolvedValue(null);

      const result = await service.validateCustomer('123');

      expect(result).toBe(false);
    });
  });

  describe('getCustomerProfile', () => {
    it('should return customer profile', async () => {
      const mockProfile = { id: '123', phone: '+919876543210' };
      customerService.getCustomerProfile.mockResolvedValue(mockProfile as any);

      const result = await service.getCustomerProfile('123');

      expect(result).toBe(mockProfile);
      expect(customerService.getCustomerProfile).toHaveBeenCalledWith('123');
    });
  });
});

describe('CustomerAuthController - OTP Endpoints', () => {
  let controller: CustomerAuthController;
  let customerAuthService: jest.Mocked<CustomerAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAuthController],
      providers: [
        {
          provide: CustomerAuthService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            getCustomerProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomerAuthController>(CustomerAuthController);
    customerAuthService = module.get(CustomerAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    const validPhone = '+919876543210';
    const sendOtpDto: CustomerSendOtpDto = { phone: validPhone };

    it('should successfully request OTP', async () => {
      const mockResponse: CustomerOtpResponseDto = {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 1800,
      };

      customerAuthService.sendOtp.mockResolvedValue(mockResponse);

      const result = await controller.requestOtp(sendOtpDto);

      expect(result).toBe(mockResponse);
      expect(customerAuthService.sendOtp).toHaveBeenCalledWith(sendOtpDto);
    });

    it('should handle rate limit exceeded', async () => {
      const error = new BadRequestException('Too many OTP requests. Please try again later.');
      customerAuthService.sendOtp.mockRejectedValue(error);

      await expect(controller.requestOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid phone number', async () => {
      const invalidDto: CustomerSendOtpDto = { phone: 'invalid' };
      const error = new BadRequestException('Please provide a valid Indian phone number');
      customerAuthService.sendOtp.mockRejectedValue(error);

      await expect(controller.requestOtp(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyOtpEndpoint', () => {
    const validPhone = '+919876543210';
    const validOtp = '123456';
    const verifyOtpDto: CustomerVerifyOtpDto = {
      phone: validPhone,
      otp: validOtp,
    };

    it('should successfully verify OTP and return auth response', async () => {
      const mockAuthResponse: CustomerAuthResponseDto = {
        token: 'jwt-token',
        customer: { id: '123', phone: validPhone },
        expiresIn: 3600 * 24 * 7,
      };

      customerAuthService.verifyOtp.mockResolvedValue(mockAuthResponse);

      const result = await controller.verifyOtpEndpoint(verifyOtpDto);

      expect(result).toBe(mockAuthResponse);
      expect(customerAuthService.verifyOtp).toHaveBeenCalledWith(verifyOtpDto);
    });

    it('should handle invalid OTP', async () => {
      const error = new UnauthorizedException('Invalid OTP');
      customerAuthService.verifyOtp.mockRejectedValue(error);

      await expect(controller.verifyOtpEndpoint(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle expired OTP', async () => {
      const error = new UnauthorizedException('OTP expired');
      customerAuthService.verifyOtp.mockRejectedValue(error);

      await expect(controller.verifyOtpEndpoint(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle invalid OTP format', async () => {
      const invalidDto: CustomerVerifyOtpDto = {
        phone: validPhone,
        otp: '123',
      };
      const error = new BadRequestException('OTP must be between 4 and 6 digits');
      customerAuthService.verifyOtp.mockRejectedValue(error);

      await expect(controller.verifyOtpEndpoint(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return customer profile', async () => {
      const mockUser = { id: '123', phone: '+919876543210' };
      const mockProfile = { id: '123', phone: '+919876543210', walletBalance: 100 };

      customerAuthService.getCustomerProfile.mockResolvedValue(mockProfile as any);

      const result = await controller.getProfile(mockUser as any);

      expect(result).toBe(mockProfile);
      expect(customerAuthService.getCustomerProfile).toHaveBeenCalledWith('123');
    });

    it('should handle profile not found', async () => {
      const mockUser = { id: '123' };
      const error = new NotFoundException('Customer profile not found');
      customerAuthService.getCustomerProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('CustomerAuthService - Edge Cases and Error Handling', () => {
  let service: CustomerAuthService;
  let customerService: jest.Mocked<CustomerService>;
  let otpService: jest.Mocked<OtpService>;
  let jwtService: jest.Mocked<JwtService>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        CustomerService,
        OtpService,
        JwtService,
        CustomLoggerService,
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
    customerService = module.get(CustomerService);
    otpService = module.get(OtpService);
    jwtService = module.get(JwtService);
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent OTP Requests', () => {
    it('should handle multiple simultaneous OTP requests for same phone', async () => {
      const phone = '+919876543210';
      const sendOtpDto: CustomerSendOtpDto = { phone };

      otpService.generateOtp.mockResolvedValue({
        success: true,
        message: 'OTP sent successfully',
      });

      // Simulate concurrent requests
      const promises = [
        service.sendOtp(sendOtpDto),
        service.sendOtp(sendOtpDto),
        service.sendOtp(sendOtpDto),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(otpService.generateOtp).toHaveBeenCalledTimes(3);
    });
  });

  describe('Customer Creation Race Conditions', () => {
    it('should handle race condition when creating customer', async () => {
      const phone = '+919876543210';
      const verifyOtpDto: CustomerVerifyOtpDto = { phone, otp: '123456' };

      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });
      jwtService.sign.mockReturnValue('mock-token');
      customerService.getCustomerProfile.mockResolvedValue({ id: '123' } as any);

      // First call finds no customer, second call also finds no customer (race condition)
      customerService.findByPhone
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      customerService.create
        .mockResolvedValueOnce({ _id: '123', phone } as any)
        .mockResolvedValueOnce({ _id: '456', phone } as any);

      const result1 = await service.verifyOtp(verifyOtpDto);
      const result2 = await service.verifyOtp(verifyOtpDto);

      expect(result1.token).toBe('mock-token');
      expect(result2.token).toBe('mock-token');
    });
  });

  describe('Service Unavailability', () => {
    it('should handle OTP service unavailability', async () => {
      const sendOtpDto: CustomerSendOtpDto = { phone: '+919876543210' };

      const error = new Error('OTP service unavailable');
      otpService.generateOtp.mockRejectedValue(error);

      await expect(service.sendOtp(sendOtpDto)).rejects.toThrow();

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_failure',
        { phone: '+919876543210', error: error.message },
        undefined,
        undefined,
      );
    });

    it('should handle database unavailability during customer creation', async () => {
      const verifyOtpDto: CustomerVerifyOtpDto = {
        phone: '+919876543210',
        otp: '123456',
      };

      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });
      customerService.findByPhone.mockResolvedValue(null);
      customerService.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow();

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_verification_error',
        { phone: '+919876543210', error: 'Database connection failed' },
        undefined,
        undefined,
      );
    });
  });

  describe('Invalid Input Validation', () => {
    it('should reject phone numbers with invalid format', async () => {
      const invalidPhones = [
        '+910123456789', // Invalid starting digits
        '+91987654321',  // Too short
        '+9198765432101', // Too long
        '9876543210',     // Missing country code
        '+1 9876543210',  // Wrong country code
      ];

      for (const phone of invalidPhones) {
        const sendOtpDto: CustomerSendOtpDto = { phone };
        const error = new BadRequestException('Please provide a valid Indian phone number');
        otpService.generateOtp.mockRejectedValue(error);

        await expect(service.sendOtp(sendOtpDto)).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject OTP with invalid characters', async () => {
      const verifyOtpDto: CustomerVerifyOtpDto = {
        phone: '+919876543210',
        otp: '12a456',
      };

      const error = new BadRequestException('OTP must contain only digits');
      otpService.verifyOtp.mockRejectedValue(error);

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject OTP with wrong length', async () => {
      const invalidOtps = ['123', '1234567'];

      for (const otp of invalidOtps) {
        const verifyOtpDto: CustomerVerifyOtpDto = {
          phone: '+919876543210',
          otp,
        };
        const error = new BadRequestException('OTP must be between 4 and 6 digits');
        otpService.verifyOtp.mockRejectedValue(error);

        await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('Security Logging', () => {
    it('should log all security events appropriately', async () => {
      const phone = '+919876543210';
      const sendOtpDto: CustomerSendOtpDto = { phone };

      otpService.generateOtp.mockResolvedValue({
        success: true,
        message: 'OTP sent',
      });

      await service.sendOtp(sendOtpDto);

      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_attempt',
        { phone },
        undefined,
        undefined,
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'customer_otp_send_success',
        { phone },
        undefined,
        undefined,
      );
    });

    it('should log business events for successful authentication', async () => {
      const verifyOtpDto: CustomerVerifyOtpDto = {
        phone: '+919876543210',
        otp: '123456',
      };

      otpService.verifyOtp.mockResolvedValue({ valid: true, message: 'OTP verified successfully' });
      customerService.findByPhone.mockResolvedValue(null);
      customerService.create.mockResolvedValue({ _id: '123', phone: '+919876543210' } as any);
      jwtService.sign.mockReturnValue('token');
      customerService.getCustomerProfile.mockResolvedValue({} as any);

      await service.verifyOtp(verifyOtpDto);

      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'customer_authenticated',
        { customerId: '123', phone: '+919876543210' },
        '123',
      );
    });
  });
});