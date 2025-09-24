import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CustomerController } from '../../src/customer/customer.controller';
import { CustomerService } from '../../src/customer/customer.service';
import { CustomLoggerService } from '../../src/common/logger/logger.service';
import { Customer, CustomerRole } from '../../src/common/interfaces/customer.interface';
import { CustomerProfileDto } from '../../src/common/dto/auth.dto';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: CustomerService;
  let logger: CustomLoggerService;

  const mockCustomer: Customer = {
    id: 'customer-123',
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
  };

  const mockCustomerProfile: CustomerProfileDto = {
    id: 'customer-123',
    phone: '+919876543210',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer',
    walletBalance: 100,
    isActive: true,
    monthlyPaymentMode: false,
    addresses: [],
    createdAt: new Date(),
  };

  const mockCustomerService = {
    getCustomerProfile: jest.fn(),
    updateMonthlyPaymentMode: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get<CustomerService>(CustomerService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return customer profile successfully', async () => {
      mockCustomerService.getCustomerProfile.mockResolvedValue(mockCustomerProfile);

      const result = await controller.getProfile(mockCustomer);

      expect(result).toEqual(mockCustomerProfile);
      expect(mockCustomerService.getCustomerProfile).toHaveBeenCalledWith('customer-123');
      expect(mockLogger.log).toHaveBeenCalledWith('Getting profile for customer: customer-123');
      expect(mockLogger.logApiRequest).toHaveBeenCalledWith(
        'GET',
        '/customers/me',
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'customer-123' },
      );
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      mockCustomerService.getCustomerProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockCustomer)).rejects.toThrow(error);

      expect(mockLogger.logApiError).toHaveBeenCalledWith(
        '/customers/me',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });

    it('should measure and log request duration', async () => {
      mockCustomerService.getCustomerProfile.mockResolvedValue(mockCustomerProfile);

      const startTime = Date.now();
      await controller.getProfile(mockCustomer);
      const endTime = Date.now();

      expect(mockLogger.logApiRequest).toHaveBeenCalledWith(
        'GET',
        '/customers/me',
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'customer-123' },
      );

      // Verify that duration is reasonable (should be less than test execution time)
      const loggedDuration = mockLogger.logApiRequest.mock.calls[0][3];
      expect(loggedDuration).toBeGreaterThanOrEqual(0);
      expect(loggedDuration).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
    });
  });

  describe('updateMonthlyPaymentMode', () => {
    const updateDto = { monthlyPaymentMode: true };

    it('should update monthly payment mode successfully', async () => {
      const updatedCustomer = { ...mockCustomer, monthlyPaymentMode: true };
      mockCustomerService.updateMonthlyPaymentMode.mockResolvedValue(updatedCustomer);

      const result = await controller.updateMonthlyPaymentMode(mockCustomer, updateDto);

      expect(result).toEqual({
        message: 'Monthly payment mode updated successfully',
        monthlyPaymentMode: true,
      });
      expect(mockCustomerService.updateMonthlyPaymentMode).toHaveBeenCalledWith(
        'customer-123',
        true,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Updating monthly payment mode for customer: customer-123 to true',
      );
      expect(mockLogger.logApiRequest).toHaveBeenCalledWith(
        'PUT',
        '/customers/monthly-payment-mode',
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'customer-123' },
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockCustomerService.updateMonthlyPaymentMode.mockRejectedValue(error);

      await expect(
        controller.updateMonthlyPaymentMode(mockCustomer, updateDto),
      ).rejects.toThrow(error);

      expect(mockLogger.logApiError).toHaveBeenCalledWith(
        '/customers/monthly-payment-mode',
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });

    it('should handle disabling monthly payment mode', async () => {
      const disableDto = { monthlyPaymentMode: false };
      const updatedCustomer = { ...mockCustomer, monthlyPaymentMode: false };
      mockCustomerService.updateMonthlyPaymentMode.mockResolvedValue(updatedCustomer);

      const result = await controller.updateMonthlyPaymentMode(mockCustomer, disableDto);

      expect(result).toEqual({
        message: 'Monthly payment mode updated successfully',
        monthlyPaymentMode: false,
      });
      expect(mockCustomerService.updateMonthlyPaymentMode).toHaveBeenCalledWith(
        'customer-123',
        false,
      );
    });

    it('should measure request duration for update operations', async () => {
      const updatedCustomer = { ...mockCustomer, monthlyPaymentMode: true };
      mockCustomerService.updateMonthlyPaymentMode.mockResolvedValue(updatedCustomer);

      await controller.updateMonthlyPaymentMode(mockCustomer, updateDto);

      expect(mockLogger.logApiRequest).toHaveBeenCalledWith(
        'PUT',
        '/customers/monthly-payment-mode',
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'customer-123' },
      );

      const loggedDuration = mockLogger.logApiRequest.mock.calls[0][3];
      expect(loggedDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle customer service unavailable', async () => {
      const error = new Error('Service unavailable');
      mockCustomerService.getCustomerProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockCustomer)).rejects.toThrow(error);
      expect(mockLogger.logApiError).toHaveBeenCalled();
    });

    it('should handle invalid customer data', async () => {
      const invalidCustomer = { ...mockCustomer, id: null } as any;

      await expect(controller.getProfile(invalidCustomer)).rejects.toThrow();
    });
  });

  describe('logging', () => {
    it('should log all successful operations', async () => {
      mockCustomerService.getCustomerProfile.mockResolvedValue(mockCustomerProfile);

      await controller.getProfile(mockCustomer);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Getting profile for customer: customer-123',
      );
      expect(mockLogger.logApiRequest).toHaveBeenCalled();
    });

    it('should log all failed operations', async () => {
      const error = new Error('Test error');
      mockCustomerService.getCustomerProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockCustomer)).rejects.toThrow();

      expect(mockLogger.logApiError).toHaveBeenCalledWith(
        '/customers/me',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });
  });

  describe('performance', () => {
    it('should complete profile requests within reasonable time', async () => {
      mockCustomerService.getCustomerProfile.mockResolvedValue(mockCustomerProfile);

      const startTime = Date.now();
      await controller.getProfile(mockCustomer);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should complete update requests within reasonable time', async () => {
      const updatedCustomer = { ...mockCustomer, monthlyPaymentMode: true };
      mockCustomerService.updateMonthlyPaymentMode.mockResolvedValue(updatedCustomer);

      const startTime = Date.now();
      await controller.updateMonthlyPaymentMode(mockCustomer, { monthlyPaymentMode: true });
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
