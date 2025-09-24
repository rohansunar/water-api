import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from '../services/user.service';
import {
  User,
  UserDocument,
  UserAddress,
  UserAddressDocument,
  UserRole,
} from '../entities/user.entity';
import { CustomLoggerService } from '../../../common/logger/logger.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

describe('UserService', () => {
  let service: UserService;
  let userModel: Model<UserDocument>;
  let addressModel: Model<UserAddressDocument>;
  let logger: CustomLoggerService;
  let eventBus: EventBusService;

  const mockUser = {
    _id: 'user123',
    phone: '9999999999',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
    walletBalance: 100,
    isActive: true,
    monthlyPaymentMode: false,
    addresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    exec: jest.fn(),
  };

  const mockAddressModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    exec: jest.fn(),
  };

  const mockLogger = {
    logModuleAction: jest.fn(),
    logPerformance: jest.fn(),
    logEvent: jest.fn(),
    logApiError: jest.fn(),
    logMemoryUsage: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(UserAddress.name),
          useValue: mockAddressModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    addressModel = module.get<Model<UserAddressDocument>>(
      getModelToken(UserAddress.name),
    );
    logger = module.get<CustomLoggerService>(CustomLoggerService);
    eventBus = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user data when user exists', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById('user123');

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        phone: '9999999999',
        role: 'customer',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockUserModel.findById).toHaveBeenCalledWith('user123');
    });

    it('should return null when user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when id is not provided', async () => {
      await expect(service.findById('')).rejects.toThrow(
        'Missing required fields: id',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user data when user exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        phone: '9999999999',
        role: 'customer',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should return null when user does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      phone: '9999999999',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    };

    it('should create a new user successfully', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existing user
      });

      const mockSavedUser = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };
      jest
        .spyOn(service as any, 'userModel')
        .mockImplementation(() => mockSavedUser);

      // Mock the constructor
      (userModel as any).mockImplementation(() => mockSavedUser);

      const result = await service.createUser({
        email: createUserDto.email,
        phone: createUserDto.phone,
        role: createUserDto.role as 'customer' | 'vendor' | 'agent' | 'admin',
      });

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        phone: '9999999999',
        role: 'customer',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user already exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.createUser({
          email: createUserDto.email,
          phone: createUserDto.phone,
          role: createUserDto.role as 'customer' | 'vendor' | 'agent' | 'admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUser', () => {
    const updateData = { email: 'updated@example.com' };

    it('should update user successfully', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.updateUser('user123', updateData);

      expect(result).toEqual({
        id: 'user123',
        email: 'updated@example.com',
        phone: '9999999999',
        role: 'customer',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateUser('nonexistent', updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateUser', () => {
    it('should return true for active user', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ isActive: true }),
        }),
      });

      const result = await service.validateUser('user123');

      expect(result).toBe(true);
    });

    it('should return false for inactive user', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ isActive: false }),
        }),
      });

      const result = await service.validateUser('user123');

      expect(result).toBe(false);
    });

    it('should return false when user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.validateUser('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details).toBeDefined();
      expect(result.details.module).toBe('user-module');
    });
  });
});
