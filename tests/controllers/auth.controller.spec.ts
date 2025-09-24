import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { LoginDto, VerifyOtpDto, AuthResponseDto } from '../../src/common/dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      const loginDto: LoginDto = { phone: '+1234567890' };
      const expectedResult = { message: 'OTP sent successfully', success: true };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle login errors', async () => {
      const loginDto: LoginDto = { phone: '+1234567890' };
      const error = new Error('Login failed');

      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  describe('verify', () => {
    it('should call authService.verifyOtp and return result', async () => {
      const verifyOtpDto: VerifyOtpDto = { phone: '+1234567890', otp: '123456' };
      const expectedResult: AuthResponseDto = {
        token: 'jwt-token',
        customer: {
          id: 'customer-id',
          phone: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'customer' as any,
          walletBalance: 100,
          isActive: true,
          monthlyPaymentMode: false,
          addresses: [],
          createdAt: new Date(),
        },
        user: {
          id: 'user-id',
          phone: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'customer' as any,
          walletBalance: 100,
          isActive: true,
          monthlyPaymentMode: false,
          addresses: [],
          createdAt: new Date(),
        },
      };

      authService.verifyOtp.mockResolvedValue(expectedResult);

      const result = await controller.verify(verifyOtpDto);

      expect(authService.verifyOtp).toHaveBeenCalledWith(verifyOtpDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle verification errors', async () => {
      const verifyOtpDto: VerifyOtpDto = { phone: '+1234567890', otp: '123456' };
      const error = new Error('Verification failed');

      authService.verifyOtp.mockRejectedValue(error);

      await expect(controller.verify(verifyOtpDto)).rejects.toThrow(error);
    });
  });
});