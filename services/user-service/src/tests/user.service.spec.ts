import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../services/user.service';
import { User, UserDocument } from '../schemas/user.schema';
import { Address, AddressDocument } from '../schemas/address.schema';
import { UserRole } from '../interfaces/user.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userModel: Model<UserDocument>;
  let addressModel: Model<AddressDocument>;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
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
    save: jest.fn().mockResolvedValue(this),
  };

  const mockAddress = {
    _id: '507f1f77bcf86cd799439012',
    userId: '507f1f77bcf86cd799439011',
    label: 'home',
    line1: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    location: {
      type: 'Point',
      coordinates: [77.209, 28.6139]
    },
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  const mockAddressModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
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
          provide: getModelToken(Address.name),
          useValue: mockAddressModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    addressModel = module.get<Model<AddressDocument>>(getModelToken(Address.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return null when user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await service.findById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return a user when found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByPhone('9999999999');
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ phone: '9999999999' });
    });

    it('should return null when user not found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByPhone('9999999999');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUserDto = {
      phone: '9999999999',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
    };

    it('should create a new user successfully', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existing user
      });

      const mockCreatedUser = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.create = jest.fn().mockReturnValue(mockCreatedUser);
      
      // Mock the constructor
      (mockUserModel as any).mockImplementation(() => mockCreatedUser);

      const result = await service.create(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser), // Existing user
      });

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await service.update('507f1f77bcf86cd799439011', updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { ...updateUserDto, updatedAt: expect.any(Date) },
        { new: true, runValidators: true }
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('507f1f77bcf86cd799439011', updateUserDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWalletBalance', () => {
    it('should update wallet balance successfully', async () => {
      const userWithBalance = { ...mockUser, walletBalance: 100, save: jest.fn().mockResolvedValue({ ...mockUser, walletBalance: 150 }) };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithBalance),
      });

      const result = await service.updateWalletBalance('507f1f77bcf86cd799439011', { amount: 50 });
      expect(result.walletBalance).toBe(150);
      expect(userWithBalance.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const userWithBalance = { ...mockUser, walletBalance: 100 };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithBalance),
      });

      await expect(service.updateWalletBalance('507f1f77bcf86cd799439011', { amount: -150 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateWalletBalance('507f1f77bcf86cd799439011', { amount: 50 }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createAddress', () => {
    const createAddressDto = {
      label: 'home',
      line1: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      latitude: 28.6139,
      longitude: 77.209,
      isDefault: true,
    };

    it('should create address successfully', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const mockCreatedAddress = { ...mockAddress, save: jest.fn().mockResolvedValue(mockAddress) };
      (mockAddressModel as any).mockImplementation(() => mockCreatedAddress);

      const result = await service.createAddress('507f1f77bcf86cd799439011', createAddressDto);
      expect(result).toEqual(mockAddress);
      expect(mockAddressModel.updateMany).toHaveBeenCalled(); // Should unset other default addresses
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.createAddress('507f1f77bcf86cd799439011', createAddressDto))
        .rejects.toThrow(NotFoundException);
    });
  });
});
