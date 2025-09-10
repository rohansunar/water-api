import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUserService = {
    findByPhone: jest.fn(),
    findById: jest.fn(),
    getUserProfile: jest.fn(),
    updateOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should generate and send OTP for valid phone', async () => {
      const loginDto = { phone: '9999999999' };

      const result = await service.login(loginDto);

      expect(result).toEqual({
        message: 'OTP sent successfully to your phone number',
        success: true,
      });
    });
  });

  describe('verifyOtp', () => {
    it('should be defined', () => {
      expect(service.verifyOtp).toBeDefined();
    });
  });

  describe('validateUser', () => {
    it('should be defined', () => {
      expect(service.validateUser).toBeDefined();
    });
  });
});
