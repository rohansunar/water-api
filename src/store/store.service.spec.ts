import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { VendorStore } from '../common/schemas/vendor-store.schema';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('StoreService', () => {
  let service: StoreService;
  let storeModel: any;
  let logger: any;

  const mockStore = {
    id: 'store-id',
    vendorId: 'vendor-id',
    name: 'Test Store',
    phone: '1234567890',
    rating: 4.5,
    activeHours: '9 AM - 9 PM',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    storeModel = {
      findById: jest.fn(),
    };

    logger = {
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: getModelToken(VendorStore.name),
          useValue: storeModel,
        },
        {
          provide: CustomLoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStoreDetails', () => {
    it('should return store details successfully', async () => {
      storeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStore),
      });

      const result = await service.getStoreDetails('store-id');

      expect(result).toHaveProperty('id', 'store-id');
      expect(result).toHaveProperty('vendor_id', 'vendor-id');
      expect(result).toHaveProperty('name', 'Test Store');
      expect(result).toHaveProperty('phone', '1234567890');
      expect(result).toHaveProperty('rating', 4.5);
      expect(result).toHaveProperty('is_verified', true);
      expect(result).toHaveProperty('active_hours', '9 AM - 9 PM');
      expect(result.address).toHaveProperty('line1', 'Default Address');
      expect(result.address).toHaveProperty('city', 'Default City');
      expect(result.address).toHaveProperty('pincode', '734001');
    });

    it('should throw NotFoundException for non-existent store', async () => {
      storeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getStoreDetails('non-existent-store')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error on database failure', async () => {
      storeModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await expect(service.getStoreDetails('store-id')).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});