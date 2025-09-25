import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminAuthService } from '../admin-auth.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;
  let configService: jest.Mocked<ConfigService>;
  let adminAuthService: jest.Mocked<AdminAuthService>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  const mockAdmin = {
    id: BigInt(1),
    email: 'admin@example.com',
    name: 'Admin User',
    roleLevel: 1,
    permissions: ['read', 'write'],
  };

  const mockPayload: any = {
    sub: '1',
    email: 'admin@example.com',
    role: 'admin',
    roleLevel: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('admin-jwt-secret-key'),
    };

    const mockAdminAuthService = {
      validateAdmin: jest.fn(),
    };

    const mockCustomLoggerService = {
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminJwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AdminAuthService,
          useValue: mockAdminAuthService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    }).compile();

    strategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);
    configService = module.get(ConfigService);
    adminAuthService = module.get(AdminAuthService);
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return admin data when token is valid', async () => {
      // Arrange
      adminAuthService.validateAdmin.mockResolvedValue(mockAdmin);

      // Act
      const result = await strategy.validate(mockPayload);

      // Assert
      expect(adminAuthService.validateAdmin).toHaveBeenCalledWith(mockPayload.sub);
      expect(result).toEqual({
        id: mockAdmin.id.toString(),
        email: mockAdmin.email,
        name: mockAdmin.name,
        roleLevel: mockAdmin.roleLevel,
        permissions: mockAdmin.permissions,
      });
      expect(customLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when admin validation fails', async () => {
      // Arrange
      const validationError = new UnauthorizedException('Admin not found or inactive');
      adminAuthService.validateAdmin.mockRejectedValue(validationError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Invalid token or admin not found'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: validationError.message,
          errorName: validationError.name,
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException with expired token message for TokenExpiredError', async () => {
      // Arrange
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      adminAuthService.validateAdmin.mockRejectedValue(expiredError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Token has expired. Please login again.'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: expiredError.message,
          errorName: expiredError.name,
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException with invalid format message for JsonWebTokenError', async () => {
      // Arrange
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      adminAuthService.validateAdmin.mockRejectedValue(jwtError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Invalid token format. Please login again.'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: jwtError.message,
          errorName: jwtError.name,
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException with not active message for NotBeforeError', async () => {
      // Arrange
      const nbfError = new Error('Token not active');
      nbfError.name = 'NotBeforeError';
      adminAuthService.validateAdmin.mockRejectedValue(nbfError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Token not active yet. Please try again later.'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: nbfError.message,
          errorName: nbfError.name,
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException with default message for other errors', async () => {
      // Arrange
      const otherError = new Error('Some other error');
      otherError.name = 'SomeOtherError';
      adminAuthService.validateAdmin.mockRejectedValue(otherError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Invalid token or admin not found'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: otherError.message,
          errorName: otherError.name,
        },
        undefined,
        undefined
      );
    });

    it('should handle database errors during admin validation', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      adminAuthService.validateAdmin.mockRejectedValue(dbError);

      // Act & Assert
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Invalid token or admin not found'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_jwt_validation_failure',
        {
          adminId: mockPayload.sub,
          email: mockPayload.email,
          error: dbError.message,
          errorName: dbError.name,
        },
        undefined,
        undefined
      );
    });
  });

  describe('constructor', () => {
    it('should initialize with correct JWT configuration', () => {
      // Assert
      expect(configService.get).toHaveBeenCalledWith(
        'JWT_ADMIN_SECRET',
        'admin-jwt-secret-key'
      );
    });
  });
});