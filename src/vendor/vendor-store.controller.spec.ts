import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VendorStoreController } from './vendor-store.controller';
import { VendorStoreService } from './vendor-store.service';
import { VendorJwtAuthGuard } from './guards/vendor-jwt-auth.guard';
import { CustomLoggerService } from '../common/logger/logger.service';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../common/dto/vendor.dto';

describe('VendorStoreController', () => {
  let controller: VendorStoreController;
  let service: jest.Mocked<VendorStoreService>;
  let customLogger: jest.Mocked<CustomLoggerService>;

  const mockVendorId = 'vendor-123';
  const mockStoreId = 'store-456';

  const mockCreateStoreDto: CreateStoreDto = {
    name: 'New Store',
    address: '456 New Street',
    phone: '+0987654321',
    active_hours: {
      monday: { open: '10:00', close: '19:00' },
      tuesday: { open: '10:00', close: '19:00' },
    },
  };

  const mockUpdateStoreDto: UpdateStoreDto = {
    name: 'Updated Store',
    address: '789 Updated Street',
    phone: '+1122334455',
    active_hours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
    },
    is_active: true,
  };

  const mockStore: StoreResponseDto = {
    id: mockStoreId,
    vendor_id: mockVendorId,
    name: 'Test Store',
    address: '123 Test Street',
    phone: '+1234567890',
    active_hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
    },
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      createStore: jest.fn(),
      getStores: jest.fn(),
      getStoreById: jest.fn(),
      updateStore: jest.fn(),
      deleteStore: jest.fn(),
    };

    const mockCustomLoggerService = {
      logBusinessEvent: jest.fn(),
      logDatabaseOperation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorStoreController],
      providers: [
        {
          provide: VendorStoreService,
          useValue: mockService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    })
      .overrideGuard(VendorJwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<VendorStoreController>(VendorStoreController);
    service = module.get(VendorStoreService);
    customLogger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    it('should create store successfully', async () => {
      // Arrange
      service.createStore.mockResolvedValue(mockStore);

      // Act
      const result = await controller.createStore(mockCreateStoreDto, mockVendorId);

      // Assert
      expect(service.createStore).toHaveBeenCalledWith(mockVendorId, mockCreateStoreDto);
      expect(result).toEqual(mockStore);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_creation_attempt',
        { vendorId: mockVendorId, storeName: mockCreateStoreDto.name },
        mockVendorId
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new BadRequestException('Invalid store data');
      service.createStore.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createStore(mockCreateStoreDto, mockVendorId)).rejects.toThrow(
        BadRequestException
      );
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_creation_attempt',
        { vendorId: mockVendorId, storeName: mockCreateStoreDto.name },
        mockVendorId
      );
    });
  });

  describe('getStores', () => {
    it('should return stores with default pagination', async () => {
      // Arrange
      const mockResponse = {
        stores: [mockStore],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      service.getStores.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getStores(mockVendorId);

      // Assert
      expect(service.getStores).toHaveBeenCalledWith(mockVendorId, 1, 10, true);
      expect(result).toEqual(mockResponse);
    });

    it('should return stores with custom pagination and include inactive', async () => {
      // Arrange
      const mockResponse = {
        stores: [mockStore],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      };
      service.getStores.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getStores(mockVendorId, '2', '5', 'false');

      // Assert
      expect(service.getStores).toHaveBeenCalledWith(mockVendorId, 2, 5, false);
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.getStores.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStores(mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('getStoreById', () => {
    it('should return store successfully', async () => {
      // Arrange
      service.getStoreById.mockResolvedValue(mockStore);

      // Act
      const result = await controller.getStoreById(mockStoreId, mockVendorId);

      // Assert
      expect(service.getStoreById).toHaveBeenCalledWith(mockVendorId, mockStoreId);
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      service.getStoreById.mockRejectedValue(new NotFoundException('Store not found'));

      // Act & Assert
      await expect(controller.getStoreById(mockStoreId, mockVendorId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.getStoreById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStoreById(mockStoreId, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('updateStore', () => {
    it('should update store successfully', async () => {
      // Arrange
      const updatedStore = { ...mockStore, name: 'Updated Store' };
      service.updateStore.mockResolvedValue(updatedStore);

      // Act
      const result = await controller.updateStore(mockStoreId, mockUpdateStoreDto, mockVendorId);

      // Assert
      expect(service.updateStore).toHaveBeenCalledWith(mockVendorId, mockStoreId, mockUpdateStoreDto);
      expect(result).toEqual(updatedStore);
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_update_attempt',
        { storeId: mockStoreId, vendorId: mockVendorId },
        mockVendorId
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      service.updateStore.mockRejectedValue(new NotFoundException('Store not found'));

      // Act & Assert
      await expect(controller.updateStore(mockStoreId, mockUpdateStoreDto, mockVendorId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for validation errors', async () => {
      // Arrange
      service.updateStore.mockRejectedValue(new BadRequestException('Invalid data'));

      // Act & Assert
      await expect(controller.updateStore(mockStoreId, mockUpdateStoreDto, mockVendorId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.updateStore.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateStore(mockStoreId, mockUpdateStoreDto, mockVendorId)).rejects.toThrow(error);
    });
  });

  describe('deleteStore', () => {
    it('should delete store successfully', async () => {
      // Arrange
      service.deleteStore.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteStore(mockStoreId, mockVendorId);

      // Assert
      expect(service.deleteStore).toHaveBeenCalledWith(mockVendorId, mockStoreId);
      expect(result).toBeUndefined();
      expect(customLogger.logBusinessEvent).toHaveBeenCalledWith(
        'store_deletion_attempt',
        { storeId: mockStoreId, vendorId: mockVendorId },
        mockVendorId
      );
    });

    it('should throw NotFoundException when store not found', async () => {
      // Arrange
      service.deleteStore.mockRejectedValue(new NotFoundException('Store not found'));

      // Act & Assert
      await expect(controller.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      service.deleteStore.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteStore(mockStoreId, mockVendorId)).rejects.toThrow(error);
    });
  });
});