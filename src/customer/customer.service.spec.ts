import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer, CustomerDocument } from '../common/schemas/customer.schema';
import { Address, AddressDocument } from '../common/schemas/address.schema';
import { CustomerRole } from '../common/interfaces/customer.interface';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerModel: Model<CustomerDocument>;
  let addressModel: Model<AddressDocument>;
  let logger: CustomLoggerService;

  const mockCustomer = {
    _id: 'customer-123',
    phone: '+919876543210',
    name: 'John Doe',
    email: 'john@example.com',
    role: CustomerRole.CUSTOMER,
    walletBalance: 100,
    isActive: true,
    monthlyPaymentMode: false,
    addresses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockCustomerModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
    exec: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockAddressModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logApiRequest: jest.fn(),
    logApiError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: getModelToken(Address.name),
          useValue: mockAddressModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerModel = module.get<Model<CustomerDocument>>(
      getModelToken(Customer.name),
    );
    addressModel = module.get<Model<AddressDocument>>(
      getModelToken(Address.name),
    );
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a customer when found', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      const result = await service.findById('customer-123');

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerModel.findById).toHaveBeenCalledWith('customer-123');
    });

    it('should return null when customer not found', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockCustomerModel.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      const result = await service.findById('customer-123');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding customer by ID customer-123:',
        error,
      );
    });
  });

  describe('findByPhone', () => {
    it('should return a customer when found by phone', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      const result = await service.findByPhone('+919876543210');

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerModel.findOne).toHaveBeenCalledWith({
        phone: '+919876543210',
      });
    });

    it('should return null when customer not found by phone', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByPhone('+919999999999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new customer successfully', async () => {
      const customerData = {
        phone: '+919876543210',
        name: 'John Doe',
        role: CustomerRole.CUSTOMER,
      };

      const mockSavedCustomer = {
        ...mockCustomer,
        save: jest.fn().mockResolvedValue(mockCustomer),
      };

      // Mock the constructor and save
      mockCustomerModel.create.mockResolvedValue(mockSavedCustomer);

      const result = await service.create(customerData);

      expect(result).toMatchObject({
        phone: '+919876543210',
        name: 'John Doe',
        role: CustomerRole.CUSTOMER,
        walletBalance: 100,
        isActive: true,
        monthlyPaymentMode: false,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Created new customer:'),
      );
    });

    it('should handle creation errors', async () => {
      const customerData = {
        phone: '+919876543210',
        name: 'John Doe',
      };

      const error = new Error('Validation error');
      mockCustomerModel.create.mockRejectedValue(error);

      await expect(service.create(customerData)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating customer:',
        error,
      );
    });
  });

  describe('update', () => {
    it('should update a customer successfully', async () => {
      const updateData = { name: 'Jane Doe' };
      const updatedCustomer = { ...mockCustomer, name: 'Jane Doe' };

      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.update('customer-123', updateData);

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer-123',
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true, runValidators: true },
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Updated customer: customer-123',
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMonthlyPaymentMode', () => {
    it('should update monthly payment mode successfully', async () => {
      const updatedCustomer = { ...mockCustomer, monthlyPaymentMode: true };

      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.updateMonthlyPaymentMode(
        'customer-123',
        true,
      );

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer-123',
        { monthlyPaymentMode: true, updatedAt: expect.any(Date) },
        { new: true },
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateMonthlyPaymentMode('nonexistent', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWalletBalance', () => {
    it('should add to wallet balance', async () => {
      const updatedCustomer = { ...mockCustomer, walletBalance: 150 };

      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.updateWalletBalance(
        'customer-123',
        50,
        'add',
      );

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer-123',
        { $inc: { walletBalance: 50 }, updatedAt: expect.any(Date) },
        { new: true },
      );
    });

    it('should subtract from wallet balance', async () => {
      const updatedCustomer = { ...mockCustomer, walletBalance: 50 };

      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.updateWalletBalance(
        'customer-123',
        50,
        'subtract',
      );

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer-123',
        { $inc: { walletBalance: -50 }, updatedAt: expect.any(Date) },
        { new: true },
      );
    });

    it('should set wallet balance', async () => {
      const updatedCustomer = { ...mockCustomer, walletBalance: 200 };

      mockCustomerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedCustomer),
      });

      const result = await service.updateWalletBalance(
        'customer-123',
        200,
        'set',
      );

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'customer-123',
        { walletBalance: 200, updatedAt: expect.any(Date) },
        { new: true },
      );
    });
  });

  describe('validateCustomerExists', () => {
    it('should return true when customer exists', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer),
      });

      const result = await service.validateCustomerExists('customer-123');

      expect(result).toBe(true);
    });

    it('should return false when customer does not exist', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateCustomerExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockCustomerModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await service.validateCustomerExists('customer-123');

      expect(result).toBe(false);
    });
  });

  describe('getCustomerStats', () => {
    it('should return customer statistics', async () => {
      // Mock different calls to countDocuments
      mockCustomerModel.countDocuments
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(100) }) // totalCustomers
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(80) }) // activeCustomers
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(20) }); // recentSignups

      mockCustomerModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'customer', count: 70 },
          { _id: 'vendor', count: 20 },
          { _id: 'admin', count: 10 },
        ]),
      });

      const result = await service.getCustomerStats();

      expect(result).toEqual({
        totalCustomers: 100,
        activeCustomers: 80,
        customersByRole: {
          customer: 70,
          vendor: 20,
          admin: 10,
        },
        recentSignups: 20,
      });
    });
  });

  describe('seedTestData', () => {
    it('should seed test data successfully', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existing customers
      });

      const mockSavedCustomer = {
        ...mockCustomer,
        save: jest.fn().mockResolvedValue(mockCustomer),
      };
      jest.spyOn(service, 'create').mockResolvedValue(mockSavedCustomer as any);
      jest.spyOn(service, 'findByPhone').mockResolvedValue(null);

      await service.seedTestData();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Customer test data seeded successfully',
      );
    });
  });

  describe('clearTestData', () => {
    it('should clear test data successfully', async () => {
      mockCustomerModel.deleteMany.mockResolvedValue({ deletedCount: 3 });

      await service.clearTestData();

      expect(mockCustomerModel.deleteMany).toHaveBeenCalledWith({
        phone: { $in: ['9999999999', '8888888888', '7777777777'] },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Customer test data cleared successfully',
      );
    });
  });
});
