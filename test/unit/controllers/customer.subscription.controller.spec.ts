import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CustomerSubscriptionController } from '../../../src/customer/controllers/customer.subscription.controller';
import { CustomerSubscriptionService } from '../../../src/customer/services/customer.subscription.service';
import { CustomLoggerService } from '../../../src/common/logger/logger.service';
import { User, UserRole } from '../../../src/common/interfaces/user.interface';

// Mock services
jest.mock('../../../src/customer/services/customer.subscription.service');
jest.mock('../../../src/common/logger/logger.service', () => ({
  CustomLoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    logApiRequest: jest.fn(),
    logApiError: jest.fn(),
  })),
}));

describe('CustomerSubscriptionController', () => {
  let controller: CustomerSubscriptionController;
  let subscriptionService: jest.Mocked<CustomerSubscriptionService>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockUser: User = {
    id: 'user-123',
    _id: 'user-123',
    phone: '+919876543210',
    name: 'Test Customer',
    email: 'test@example.com',
    addresses: [],
    walletBalance: 1000,
    role: UserRole.CUSTOMER,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerSubscriptionController],
      providers: [CustomerSubscriptionService, CustomLoggerService],
    }).compile();

    controller = module.get<CustomerSubscriptionController>(
      CustomerSubscriptionController,
    );
    subscriptionService = module.get(CustomerSubscriptionService);
    logger = module.get(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerSubscriptions', () => {
    it('should return customer subscriptions successfully', async () => {
      const mockSubscriptions = [
        { id: 'sub-1', productId: 'prod-1', status: 'active' },
        { id: 'sub-2', productId: 'prod-2', status: 'active' },
      ];

      subscriptionService.getCustomerSubscriptions.mockResolvedValue(
        mockSubscriptions,
      );

      const result = await controller.getCustomerSubscriptions(mockUser);

      expect(result).toEqual(mockSubscriptions);
      expect(subscriptionService.getCustomerSubscriptions).toHaveBeenCalledWith(
        'user-123',
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Getting subscriptions for customer: user-123`,
      );
      expect(logger.logApiRequest).toHaveBeenCalledWith(
        'GET',
        '/customers/subscriptions',
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'user-123' },
      );
    });

    it('should handle empty subscriptions array', async () => {
      subscriptionService.getCustomerSubscriptions.mockResolvedValue([]);

      const result = await controller.getCustomerSubscriptions(mockUser);

      expect(result).toEqual([]);
      expect(subscriptionService.getCustomerSubscriptions).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      subscriptionService.getCustomerSubscriptions.mockRejectedValue(error);

      await expect(
        controller.getCustomerSubscriptions(mockUser),
      ).rejects.toThrow(error);
      expect(logger.logApiError).toHaveBeenCalledWith(
        '/customers/subscriptions',
        'GET',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-123',
        frequency: 'weekly',
        quantity: 2,
      };
      const mockSubscription = { id: 'sub-123', ...createSubscriptionDto };

      subscriptionService.createSubscription.mockResolvedValue(
        mockSubscription,
      );

      const result = await controller.createSubscription(
        mockUser,
        createSubscriptionDto,
      );

      expect(result).toEqual(mockSubscription);
      expect(subscriptionService.createSubscription).toHaveBeenCalledWith(
        'user-123',
        createSubscriptionDto,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Creating subscription for customer: user-123`,
      );
      expect(logger.logApiRequest).toHaveBeenCalledWith(
        'POST',
        '/customers/subscriptions',
        HttpStatus.CREATED,
        expect.any(Number),
        { userId: 'user-123' },
      );
    });

    it('should handle different subscription data', async () => {
      const createSubscriptionDto = {
        product_id: 'prod-456',
        frequency: 'daily',
        quantity: 1,
        special_instructions: 'Handle carefully',
      };
      const mockSubscription = { id: 'sub-456', ...createSubscriptionDto };

      subscriptionService.createSubscription.mockResolvedValue(
        mockSubscription,
      );

      const result = await controller.createSubscription(
        mockUser,
        createSubscriptionDto,
      );

      expect(result).toEqual(mockSubscription);
      expect(subscriptionService.createSubscription).toHaveBeenCalledWith(
        'user-123',
        createSubscriptionDto,
      );
    });

    it('should handle service errors', async () => {
      const createSubscriptionDto = { product_id: 'prod-123' };
      const error = new Error('Validation failed');
      subscriptionService.createSubscription.mockRejectedValue(error);

      await expect(
        controller.createSubscription(mockUser, createSubscriptionDto),
      ).rejects.toThrow(error);
      expect(logger.logApiError).toHaveBeenCalledWith(
        '/customers/subscriptions',
        'POST',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const updateSubscriptionDto = {
        frequency: 'monthly',
        quantity: 3,
      };
      const mockUpdatedSubscription = {
        id: subscriptionId,
        ...updateSubscriptionDto,
      };

      subscriptionService.updateSubscription.mockResolvedValue(
        mockUpdatedSubscription,
      );

      const result = await controller.updateSubscription(
        mockUser,
        subscriptionId,
        updateSubscriptionDto,
      );

      expect(result).toEqual(mockUpdatedSubscription);
      expect(subscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user-123',
        subscriptionId,
        updateSubscriptionDto,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Updating subscription ${subscriptionId} for customer: user-123`,
      );
      expect(logger.logApiRequest).toHaveBeenCalledWith(
        'PUT',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'user-123' },
      );
    });

    it('should handle status updates', async () => {
      const subscriptionId = 'sub-456';
      const updateSubscriptionDto = { status: 'paused' };
      const mockUpdatedSubscription = { id: subscriptionId, status: 'paused' };

      subscriptionService.updateSubscription.mockResolvedValue(
        mockUpdatedSubscription,
      );

      const result = await controller.updateSubscription(
        mockUser,
        subscriptionId,
        updateSubscriptionDto,
      );

      expect(result).toEqual(mockUpdatedSubscription);
      expect(subscriptionService.updateSubscription).toHaveBeenCalledWith(
        'user-123',
        subscriptionId,
        updateSubscriptionDto,
      );
    });

    it('should handle service errors', async () => {
      const subscriptionId = 'sub-123';
      const updateSubscriptionDto = { quantity: 5 };
      const error = new Error('Subscription not found');
      subscriptionService.updateSubscription.mockRejectedValue(error);

      await expect(
        controller.updateSubscription(
          mockUser,
          subscriptionId,
          updateSubscriptionDto,
        ),
      ).rejects.toThrow(error);
      expect(logger.logApiError).toHaveBeenCalledWith(
        `/customers/subscriptions/${subscriptionId}`,
        'PUT',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const cancelSubscriptionDto = { reason: 'No longer needed' };

      subscriptionService.cancelSubscription.mockResolvedValue(undefined);

      const result = await controller.cancelSubscription(
        mockUser,
        subscriptionId,
        cancelSubscriptionDto,
      );

      expect(result).toEqual({
        message: 'Subscription cancelled successfully',
      });
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(
        'user-123',
        subscriptionId,
        'No longer needed',
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Cancelling subscription ${subscriptionId} for customer: user-123`,
      );
      expect(logger.logApiRequest).toHaveBeenCalledWith(
        'DELETE',
        `/customers/subscriptions/${subscriptionId}`,
        HttpStatus.OK,
        expect.any(Number),
        { userId: 'user-123' },
      );
    });

    it('should handle different cancellation reasons', async () => {
      const subscriptionId = 'sub-456';
      const reasons = [
        'Moving to different area',
        'Switching products',
        'Cost too high',
      ];

      for (const reason of reasons) {
        const cancelSubscriptionDto = { reason };
        subscriptionService.cancelSubscription.mockResolvedValue(undefined);

        const result = await controller.cancelSubscription(
          mockUser,
          subscriptionId,
          cancelSubscriptionDto,
        );

        expect(result).toEqual({
          message: 'Subscription cancelled successfully',
        });
        expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(
          'user-123',
          subscriptionId,
          reason,
        );
      }
    });

    it('should handle service errors', async () => {
      const subscriptionId = 'sub-123';
      const cancelSubscriptionDto = { reason: 'Test reason' };
      const error = new Error('Cancellation failed');
      subscriptionService.cancelSubscription.mockRejectedValue(error);

      await expect(
        controller.cancelSubscription(
          mockUser,
          subscriptionId,
          cancelSubscriptionDto,
        ),
      ).rejects.toThrow(error);
      expect(logger.logApiError).toHaveBeenCalledWith(
        `/customers/subscriptions/${subscriptionId}`,
        'DELETE',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    });
  });

  describe('Controller instantiation', () => {
    it('should be properly instantiated with service and logger', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CustomerSubscriptionController);
    });
  });
});
