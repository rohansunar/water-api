import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { AdminLoginDto } from '../common/dto/admin.dto';

jest.mock('bcrypt');
const bcrypt = require('bcrypt');

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let customLogger: jest.Mocked<CustomLoggerService>;
  let mockPrisma: any;

  const mockAdmin = {
    id: BigInt(1),
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: '$2b$12$hashedpassword',
    isActive: true,
    roleLevel: 1,
    permissions: ['read', 'write'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
  };

  const mockLoginDto: AdminLoginDto = {
    email: 'admin@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    // Mock bcrypt
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockCustomLoggerService = {
      logSecurityEvent: jest.fn(),
      logBusinessEvent: jest.fn(),
      logDatabaseOperation: jest.fn(),
    };

    mockPrisma = {
      admin: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    customLogger = module.get(CustomLoggerService);

    // Replace the prisma instance
    (service as any).prisma = mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login admin with valid credentials', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.admin.update.mockResolvedValue(mockAdmin);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.login(mockLoginDto);

      // Assert
      expect(mockPrisma.admin.findUnique).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
      expect(mockPrisma.admin.update).toHaveBeenCalledWith({
        where: { id: mockAdmin.id },
        data: { lastActiveAt: expect.any(Date) },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockAdmin.id.toString(),
        email: mockAdmin.email,
        role: 'admin',
        roleLevel: mockAdmin.roleLevel,
      });
      expect(result).toEqual({
        token: 'mock-jwt-token',
        admin: {
          id: mockAdmin.id.toString(),
          email: mockAdmin.email,
          name: mockAdmin.name,
          roleLevel: mockAdmin.roleLevel,
          permissions: mockAdmin.permissions,
          isActive: mockAdmin.isActive,
          createdAt: mockAdmin.createdAt,
          updatedAt: mockAdmin.updatedAt,
        },
        expiresIn: 3600,
      });
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_attempt',
        { email: mockLoginDto.email },
        undefined,
        undefined
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_success',
        { email: mockLoginDto.email, adminId: mockAdmin.id.toString() },
        mockAdmin.id.toString(),
        undefined
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'admin_authenticated',
        { adminId: mockAdmin.id.toString(), email: mockLoginDto.email },
        mockAdmin.id.toString()
      );
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_failure',
        { email: mockLoginDto.email, reason: 'admin_not_found' },
        undefined,
        undefined
      );
    });

    it('should throw ForbiddenException when account is inactive', async () => {
      // Arrange
      const inactiveAdmin = { ...mockAdmin, isActive: false };
      mockPrisma.admin.findUnique.mockResolvedValue(inactiveAdmin);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Account is inactive'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_failure',
        {
          email: mockLoginDto.email,
          adminId: inactiveAdmin.id.toString(),
          reason: 'account_inactive'
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException when password hash is missing', async () => {
      // Arrange
      const adminWithoutPassword = { ...mockAdmin, passwordHash: null };
      mockPrisma.admin.findUnique.mockResolvedValue(adminWithoutPassword);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_failure',
        {
          email: mockLoginDto.email,
          adminId: adminWithoutPassword.id.toString(),
          reason: 'no_password_hash'
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockClear();
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_failure',
        {
          email: mockLoginDto.email,
          adminId: mockAdmin.id.toString(),
          reason: 'invalid_password'
        },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException on database error during find', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrisma.admin.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Authentication failed'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_login_error',
        { email: mockLoginDto.email, error: dbError.message },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException on database error during update', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
      const dbError = new Error('Database update failed');
      mockPrisma.admin.update.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'Authentication failed'
      );
    });
  });

  describe('validateAdmin', () => {
    it('should return admin when valid admin ID is provided', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);

      // Act
      const result = await service.validateAdmin('1');

      // Assert
      expect(mockPrisma.admin.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(result).toEqual(mockAdmin);
      expect(customLogger.logDatabaseOperation).toHaveBeenCalledWith(
        'find',
        'admins',
        expect.any(Number),
        true
      );
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      // Arrange
      mockPrisma.admin.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateAdmin('1')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateAdmin('1')).rejects.toThrow(
        'Admin not found or inactive'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_validation_failure',
        { adminId: '1', reason: 'admin_not_found_or_inactive' },
        undefined,
        undefined
      );
    });

    it('should throw UnauthorizedException when admin is inactive', async () => {
      // Arrange
      const inactiveAdmin = { ...mockAdmin, isActive: false };
      mockPrisma.admin.findUnique.mockResolvedValue(inactiveAdmin);

      // Act & Assert
      await expect(service.validateAdmin('1')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateAdmin('1')).rejects.toThrow(
        'Admin not found or inactive'
      );
      expect(customLogger.logSecurityEvent).toHaveBeenCalledWith(
        'admin_validation_failure',
        { adminId: '1', reason: 'admin_not_found_or_inactive' },
        undefined,
        undefined
      );
    });

    it('should throw error on database error', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrisma.admin.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.validateAdmin('1')).rejects.toThrow(dbError);
      expect(customLogger.logDatabaseOperation).toHaveBeenCalledWith(
        'find',
        'admins',
        expect.any(Number),
        false,
        dbError
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const password = 'testpassword';
      const mockHash = 'hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce(mockHash);

      // Act
      const result = await service.hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(mockHash);
    });
  });
});