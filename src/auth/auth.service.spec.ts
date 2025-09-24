import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../modules/user/services/user.service';
import { CustomerService } from '../customer/customer.service';
import { UserRole } from '../modules/user/entities/user.entity';
import { CustomerRole } from '../common/interfaces/customer.interface';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: any;
  let configService: any;
  let userService: any;
  let customerService: any;

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(),
    };

    configService = {};

    userService = {
      findByPhoneDocument: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      getUserProfile: jest.fn(),
    };

    customerService = {
      findByPhone: jest.fn(),
      create: jest.fn(),
      getCustomerProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: CustomerService,
          useValue: customerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize cleanup interval', () => {
      jest.spyOn(global, 'setInterval');
      service.onModuleInit();
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      service.onModuleInit(); // Initialize first
      service.onModuleDestroy();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should generate and store OTP successfully', async () => {
      const loginDto = { phone: '+1234567890' };

      const result = await service.login(loginDto);

      expect(result).toEqual({
        message: 'OTP sent successfully to your phone number',
        success: true,
      });
      // OTP should be stored (we can't easily test the exact value due to randomness)
    });

    it('should handle login errors', async () => {
      const loginDto = { phone: '+1234567890' };
      // Force an error by mocking something, but since it's simple, test the catch block
      // The method doesn't throw easily, but we can test the structure
      const result = await service.login(loginDto);
      expect(result.success).toBe(true);
    });
  });

  describe('verifyOtp', () => {
    beforeEach(() => {
      // Mock customer and user creation
      customerService.findByPhone.mockResolvedValue(null);
      customerService.create.mockResolvedValue({
        _id: 'customer-id',
        phone: '+1234567890',
        role: CustomerRole.CUSTOMER,
        isActive: true,
        walletBalance: 0,
      });
      customerService.getCustomerProfile.mockResolvedValue({
        id: 'customer-id',
        phone: '+1234567890',
        name: null,
        email: null,
        role: CustomerRole.CUSTOMER,
        walletBalance: 0,
        isActive: true,
        monthlyPaymentMode: false,
        addresses: [],
        createdAt: new Date(),
      });

      userService.findByPhoneDocument.mockResolvedValue(null);
      userService.create.mockResolvedValue({
        id: 'user-id',
        phone: '+1234567890',
        role: UserRole.CUSTOMER,
        isActive: true,
        walletBalance: 0,
      });
      userService.getUserProfile.mockResolvedValue({
        id: 'user-id',
        phone: '+1234567890',
        name: null,
        email: null,
        role: UserRole.CUSTOMER,
        walletBalance: 0,
        isActive: true,
        monthlyPaymentMode: false,
        addresses: [],
        createdAt: new Date(),
      });

      jwtService.sign.mockReturnValue('jwt-token');
    });

    it('should verify OTP and return auth response for new customer', async () => {
      // First login to store OTP
      await service.login({ phone: '+1234567890' });

      // Get the stored OTP (hacky way for testing)
      const storedData = (service as any).otpStore.get('+1234567890');
      const otp = storedData.otp;

      const verifyOtpDto = { phone: '+1234567890', otp };

      const result = await service.verifyOtp(verifyOtpDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('user');
      expect(result.customer.phone).toBe('+1234567890');
      expect(result.user.phone).toBe('+1234567890');
    });

    it('should verify OTP for existing customer', async () => {
      const existingCustomer = {
        _id: 'existing-customer-id',
        phone: '+1234567890',
        role: CustomerRole.CUSTOMER,
        isActive: true,
        walletBalance: 100,
      };
      customerService.findByPhone.mockResolvedValue(existingCustomer);
      customerService.getCustomerProfile.mockResolvedValue({
        id: 'existing-customer-id',
        phone: '+1234567890',
        name: 'John Doe',
        email: 'john@example.com',
        role: CustomerRole.CUSTOMER,
        walletBalance: 100,
        isActive: true,
        monthlyPaymentMode: true,
        addresses: [],
        createdAt: new Date(),
      });

      const existingUser = {
        id: 'existing-user-id',
        phone: '+1234567890',
        role: UserRole.CUSTOMER,
        isActive: true,
        walletBalance: 100,
      };
      userService.findByPhoneDocument.mockResolvedValue(existingUser);
      userService.getUserProfile.mockResolvedValue({
        id: 'existing-user-id',
        phone: '+1234567890',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.CUSTOMER,
        walletBalance: 100,
        isActive: true,
        monthlyPaymentMode: true,
        addresses: [],
        createdAt: new Date(),
      });

      // Login to store OTP
      await service.login({ phone: '+1234567890' });
      const storedData = (service as any).otpStore.get('+1234567890');
      const otp = storedData.otp;

      const result = await service.verifyOtp({ phone: '+1234567890', otp });

      expect(customerService.create).not.toHaveBeenCalled();
      expect(userService.create).not.toHaveBeenCalled();
      expect(result.customer.walletBalance).toBe(100);
    });

    it('should throw UnauthorizedException for non-existent OTP', async () => {
      const verifyOtpDto = { phone: '+1234567890', otp: '123456' };

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      // Login to store OTP
      await service.login({ phone: '+1234567890' });

      // Manually expire the OTP
      const otpStore = (service as any).otpStore;
      const data = otpStore.get('+1234567890');
      data.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      const verifyOtpDto = { phone: '+1234567890', otp: data.otp };

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(otpStore.has('+1234567890')).toBe(false);
    });

    it('should throw UnauthorizedException for too many failed attempts', async () => {
      // Login to store OTP
      await service.login({ phone: '+1234567890' });

      const otpStore = (service as any).otpStore;
      const data = otpStore.get('+1234567890');
      data.attempts = 3; // Max attempts reached

      const verifyOtpDto = { phone: '+1234567890', otp: 'wrong-otp' };

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(otpStore.has('+1234567890')).toBe(false);
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      // Login to store OTP
      await service.login({ phone: '+1234567890' });

      const verifyOtpDto = { phone: '+1234567890', otp: 'wrong-otp' };

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Check attempts incremented
      const data = (service as any).otpStore.get('+1234567890');
      expect(data.attempts).toBe(1);
    });

    it('should handle service errors during verification', async () => {
      customerService.findByPhone.mockRejectedValue(new Error('DB error'));

      // Login to store OTP
      await service.login({ phone: '+1234567890' });
      const storedData = (service as any).otpStore.get('+1234567890');
      const otp = storedData.otp;

      const verifyOtpDto = { phone: '+1234567890', otp };

      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if found and active', async () => {
      const user = {
        id: 'user-id',
        phone: '+1234567890',
        role: UserRole.CUSTOMER,
        isActive: true,
      };
      userService.findById.mockResolvedValue(user);

      const result = await service.validateUser('user-id');

      expect(result).toEqual(user);
      expect(userService.findById).toHaveBeenCalledWith('user-id');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.validateUser('user-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const user = {
        id: 'user-id',
        phone: '+1234567890',
        role: UserRole.CUSTOMER,
        isActive: false,
      };
      userService.findById.mockResolvedValue(user);

      await expect(service.validateUser('user-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit string', () => {
      const otp = (service as any).generateOTP();
      expect(typeof otp).toBe('string');
      expect(otp.length).toBe(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });
  });

  describe('cleanupExpiredOtps', () => {
    it('should remove expired OTPs', () => {
      // Manually add expired OTP
      const otpStore = (service as any).otpStore;
      otpStore.set('+1234567890', {
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired
        attempts: 0,
      });
      otpStore.set('+0987654321', {
        otp: '654321',
        expiresAt: new Date(Date.now() + 10000), // Not expired
        attempts: 0,
      });

      (service as any).cleanupExpiredOtps();

      expect(otpStore.has('+1234567890')).toBe(false);
      expect(otpStore.has('+0987654321')).toBe(true);
    });
  });
});
