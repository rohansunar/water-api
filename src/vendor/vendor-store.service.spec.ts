import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { VendorStoreService } from './vendor-store.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { VendorStore } from '../common/schemas/vendor-store.schema';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../common/dto/vendor.dto';

describe('VendorStoreService', () => {
  let service: VendorStoreService;
  let storeModel: jest.Mocked<Model<VendorStore>>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  const mockVendorId = 'vendor-123';
  const mockStoreId = 'store-456';

  const mockStore = {
    _id: mockStoreId,
    vendorId: mockVendorId,
    name: 'Test Store',
    address: '123 Test Street',
    phone: '+1234567890',
    active_hours: '9:00 AM - 6:00 PM',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateStoreDto: CreateStoreDto = {
    name: 'New Store',
    address: '456 New Street',
    phone: '+0987654321',
    active_hours: '10:00 AM - 7:00 PM',
  };

  const mockUpdateStoreDto: UpdateStoreDto = {
    name: 'Updated Store',
    address: '789 Updated Street',
    phone: '+1122334455',
    active_hours: '8:00 AM - 8:00 PM',
    is_active: true,
  };

  beforeEach(async () => {
    const mockStoreModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockCustomLoggerService = {
      logBusinessEvent: jest.fn(),
      logDatabaseOperation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorStoreService,
        {
          provide: getModelToken(VendorStore.name),
          useValue: mockStoreModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    }).compile();

    service = module.get<VendorStoreService>(VendorStoreService);
    storeModel = module.get(getModelToken(VendorStore.name));
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    it('should create store successfully', async () => {
      // Arrange
      const expectedStore = { ...mockStore, ...mockCreateStoreDto };
      storeModel.create.mockResolvedValue(expectedStore);

      // Act
      const result = await service.createStore(mockVendorId, mockCreateStoreDto);

      // Assert
      expect(storeModel.create).toHaveBeenCalledWith({
        vendorId: mockVendorId,
        ...mockCreateStoreDto,
      });
      expect(result).toEqual(expectedStore);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_created',
        { vendorId: mockVendorId, storeName: mockCreateStoreDto.name },
        mockVendorId
      );
      expect(customLogger.logDatabaseOperation).toHaveBeenCalledWith(
        'create',
        'stores',
        expect.any(Number),
        true
      );
    });

    it('should throw ConflictException when store creation fails', async () => {
      // Arrange
      const dbError = new Error('Duplicate key error');
      storeModel.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.createStore(mockVendorId, mockCreateStoreDto)).rejects.toThrow(
        ConflictException
      );
      await expect(service.createStore(mockVendorId, mockCreateStoreDto)).rejects.toThrow(
        'Failed to create store'
      );
      expect(customLogger.logError).toHaveBeenCalledWith(
        'Failed to create store',
        dbError,
        { vendorId: mockVendorId }
      );
    });
  });

  describe('getStores', () => {
    it('should return stores with pagination', async () => {
      // Arrange
      const mockStores = [mockStore];
      const query = { vendorId: mockVendorId, isActive: true };
      const options = { skip: 0, limit: 10, sort: { createdAt: -1 } };

      storeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockStores),
          }),
        }),
      } as any);

      storeModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getStores(mockVendorId, 1, 10, true);

      // Assert
      expect(storeModel.find).toHaveBeenCalledWith(query);
      expect(storeModel.countDocuments).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        stores: mockStores,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return all stores when includeInactive is true', async () => {
      // Arrange
      const mockStores = [mockStore];
      const query = { vendorId: mockVendorId };

      storeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockStores),
          }),
        }),
      } as any);

      storeModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.getStores(mockVendorId, 1, 10, false);

      // Assert
      expect(storeModel.find).toHaveBeenCalledWith(query);
      expect(result.stores).toEqual(mockStores);
    });

    it('should handle empty results', async () => {
      // Arrange
      storeModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      storeModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.getStores(mockVendorId, 1, 10, true);

      // Assert
      expect(result).toEqual({
        stores: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('getStoreById', () => {
    it('should return store when found', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(mockStore);

      // Act
      const result = await service.getStoreById(mockStoreId, mockVendorId);

      // Assert
      expect(storeModel.findOne).toHaveBeenCalledWith({
        _id: mockStoreId,
        vendorId: mockVendorId,
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStoreById(mockStoreId, mockVendorId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getStoreById(mockStoreId, mockVendorId)).rejects.toThrow(
        'Store not found'
      );
    });

    it('should throw NotFoundException when store belongs to different vendor', async () => {
      // Arrange
      storeModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStoreById(mockStoreId, 'different-vendor')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStore', () => {
    it('should update store successfully', async () => {
      // Arrange
      const updatedStore = { ...mockStore, ...mockUpdateStoreDto };
      storeModel.findByIdAndUpdate.mockResolvedValue(updatedStore);

      // Act
      const result = await service.updateStore(mockStoreId, mockVendorId, mockUpdateStoreDto);

      // Assert
      expect(storeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStoreId,
        { ...mockUpdateStoreDto, updatedAt: expect.any(Date) },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedStore);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_updated',
        { storeId: mockStoreId, vendorId: mockVendorId },
        mockVendorId
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      storeModel.findByIdAndUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStore(mockStoreId, mockVendorId, mockUpdateStoreDto)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.updateStore(mockStoreId, mockVendorId, mockUpdateStoreDto)).rejects.toThrow(
        'Store not found'
      );
    });

    it('should throw BadRequestException when update fails due to validation', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      storeModel.findByIdAndUpdate.mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.updateStore(mockStoreId, mockVendorId, mockUpdateStoreDto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.updateStore(mockStoreId, mockVendorId, mockUpdateStoreDto)).rejects.toThrow(
        'Invalid store data'
      );
    });
  });

  describe('deleteStore', () => {
    it('should soft delete store successfully', async () => {
      // Arrange
      const updatedStore = { ...mockStore, isActive: false };
      storeModel.findByIdAndUpdate.mockResolvedValue(updatedStore);

      // Act
      const result = await service.deleteStore(mockStoreId, mockVendorId);

      // Assert
      expect(storeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockStoreId,
        { isActive: false, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedStore);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_deleted',
        { storeId: mockStoreId, vendorId: mockVendorId },
        mockVendorId
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      storeModel.findByIdAndUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(
        'Store not found'
      );
    });

    it('should throw ConflictException when soft delete fails', async () => {
      // Arrange
      const dbError = new Error('Database error');
      storeModel.findByIdAndUpdate.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(
        ConflictException
      );
      await expect(service.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(
        'Failed to delete store'
      );
    });
  });

});