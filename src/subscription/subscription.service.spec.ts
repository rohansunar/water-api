import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ProductService } from '../product/product.service';
import { UserService } from '../modules/user/services/user.service';
import { OrderService } from '../order/order.service';
import { SubscriptionStatus, SubscriptionFrequency } from '../common/interfaces/subscription.interface';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let productService: any;
  let userService: any;
  let orderService: any;

  const mockProduct = {
    id: 'product-id',
    vendorId: 'vendor-id',
    price: 100,
    stockQuantity: 10,
    isActive: true,
    hasDeposit: true,
    depositAmount: 50,
  };

  const mockUser = {
    id: 'user-id',
    phone: '+1234567890',
    walletBalance: 200,
  };

  beforeEach(async () => {
    productService = {
      findById: jest.fn(),
      updateStock: jest.fn(),
    };

    userService = {
      findById: jest.fn(),
      updateWalletBalance: jest.fn(),
    };

    orderService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: ProductService,
          useValue: productService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: OrderService,
          useValue: orderService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createSubscriptionDto = {
      product_id: 'product-id',
      quantity: 2,
      frequency: SubscriptionFrequency.WEEKLY,
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      special_instructions: 'Handle with care',
    };

    beforeEach(() => {
      productService.findById.mockResolvedValue(mockProduct);
      userService.findById.mockResolvedValue(mockUser);
      productService.updateStock.mockResolvedValue(undefined);
      userService.updateWalletBalance.mockResolvedValue(undefined);
      orderService.createLedgerEntry = jest.fn();
    });

    it('should create subscription successfully', async () => {
      const result = await service.create('user-id', createSubscriptionDto);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe('user-id');
      expect(result.productId).toBe('product-id');
      expect(result.vendorId).toBe('vendor-id');
      expect(result.frequency).toBe(SubscriptionFrequency.WEEKLY);
      expect(result.quantity).toBe(2);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.totalAmount).toBe(315); // 200 + 100 + 15
    });

    it('should create subscription with custom delivery days', async () => {
      const dtoWithDays = { ...createSubscriptionDto, days: ['monday', 'wednesday'] };

      const result = await service.create('user-id', dtoWithDays);

      expect(result.deliveryDays).toEqual(['monday', 'wednesday']);
    });

    it('should create subscription with end date', async () => {
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days later
      const dtoWithEndDate = { ...createSubscriptionDto, end_date: endDate.toISOString() };

      const result = await service.create('user-id', dtoWithEndDate);

      expect(result.endDate).toEqual(endDate);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productService.findById.mockResolvedValue(null);

      await expect(service.create('user-id', createSubscriptionDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for inactive product', async () => {
      productService.findById.mockResolvedValue({ ...mockProduct, isActive: false });

      await expect(service.create('user-id', createSubscriptionDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.create('user-id', createSubscriptionDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for past start date', async () => {
      const pastDateDto = {
        ...createSubscriptionDto,
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      };

      await expect(service.create('user-id', pastDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for end date before start date', async () => {
      const invalidEndDateDto = {
        ...createSubscriptionDto,
        end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      };

      await expect(service.create('user-id', invalidEndDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByUser', () => {
    it('should return user subscriptions sorted by creation date', async () => {
      const subscription1 = {
        id: 'sub-1',
        userId: 'user-id',
        productId: 'product-1',
        vendorId: 'vendor-1',
        frequency: SubscriptionFrequency.WEEKLY,
        quantity: 1,
        deliveryDays: ['monday'],
        startDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        totalAmount: 100,
        nextDeliveryDate: new Date(),
        deliveryHistory: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      const subscription2 = {
        id: 'sub-2',
        userId: 'user-id',
        productId: 'product-2',
        vendorId: 'vendor-2',
        frequency: SubscriptionFrequency.DAILY,
        quantity: 2,
        deliveryDays: ['monday', 'wednesday'],
        startDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        totalAmount: 200,
        nextDeliveryDate: new Date(),
        deliveryHistory: [],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date(),
      };

      (service as any).subscriptions.set('sub-1', subscription1);
      (service as any).subscriptions.set('sub-2', subscription2);
      (service as any).userSubscriptionIndex.set('user-id', ['sub-1', 'sub-2']);

      const result = await service.findByUser('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-2'); // Newest first
      expect(result[1].id).toBe('sub-1');
    });

    it('should return empty array for user with no subscriptions', async () => {
      const result = await service.findByUser('user-without-subscriptions');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return subscription if found', async () => {
      const subscription = {
        id: 'sub-1',
        userId: 'user-id',
        productId: 'product-1',
        vendorId: 'vendor-1',
        frequency: SubscriptionFrequency.WEEKLY,
        quantity: 1,
        deliveryDays: ['monday'],
        startDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        totalAmount: 100,
        nextDeliveryDate: new Date(),
        deliveryHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).subscriptions.set('sub-1', subscription);

      const result = await service.findById('sub-1');

      expect(result).toEqual(subscription);
    });

    it('should return null if subscription not found', async () => {
      const result = await service.findById('non-existent-subscription');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-id',
      productId: 'product-id',
      vendorId: 'vendor-1',
      frequency: SubscriptionFrequency.WEEKLY,
      quantity: 1,
      deliveryDays: ['monday'],
      startDate: new Date(),
      status: SubscriptionStatus.ACTIVE,
      totalAmount: 100,
      nextDeliveryDate: new Date(),
      deliveryHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).subscriptions.set('sub-1', subscription);
      productService.findById.mockResolvedValue(mockProduct);
    });

    it('should update subscription frequency', async () => {
      const updateDto = { frequency: SubscriptionFrequency.DAILY };

      const result = await service.update('sub-1', 'user-id', updateDto);

      expect(result.frequency).toBe(SubscriptionFrequency.DAILY);
      expect(result.deliveryDays).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
    });

    it('should update subscription quantity and recalculate total', async () => {
      const updateDto = { quantity: 3 };

      const result = await service.update('sub-1', 'user-id', updateDto);

      expect(result.quantity).toBe(3);
      expect(result.totalAmount).toBe(465); // 300 + 150 + 15
    });

    it('should update subscription status', async () => {
      const updateDto = { status: SubscriptionStatus.PAUSED };

      const result = await service.update('sub-1', 'user-id', updateDto);

      expect(result.status).toBe(SubscriptionStatus.PAUSED);
    });

    it('should update special instructions', async () => {
      const updateDto = { special_instructions: 'New instructions' };

      const result = await service.update('sub-1', 'user-id', updateDto);

      expect((service as any).subscriptions.get('sub-1').specialInstructions).toBe('New instructions');
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      const updateDto = { frequency: SubscriptionFrequency.DAILY };

      await expect(service.update('non-existent', 'user-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to update another user subscription', async () => {
      const updateDto = { frequency: SubscriptionFrequency.DAILY };

      await expect(service.update('sub-1', 'different-user', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-id',
      productId: 'product-1',
      vendorId: 'vendor-1',
      frequency: SubscriptionFrequency.WEEKLY,
      quantity: 1,
      deliveryDays: ['monday'],
      startDate: new Date(),
      status: SubscriptionStatus.ACTIVE,
      totalAmount: 100,
      nextDeliveryDate: new Date(),
      deliveryHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).subscriptions.set('sub-1', subscription);
    });

    it('should cancel subscription successfully', async () => {
      const result = await service.cancel('sub-1', 'user-id');

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      await expect(service.cancel('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to cancel another user subscription', async () => {
      await expect(service.cancel('sub-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already cancelled subscription', async () => {
      const cancelledSub = { ...subscription, status: SubscriptionStatus.CANCELLED };
      (service as any).subscriptions.set('sub-1', cancelledSub);

      await expect(service.cancel('sub-1', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('pause', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-id',
      productId: 'product-1',
      vendorId: 'vendor-1',
      frequency: SubscriptionFrequency.WEEKLY,
      quantity: 1,
      deliveryDays: ['monday'],
      startDate: new Date(),
      status: SubscriptionStatus.ACTIVE,
      totalAmount: 100,
      nextDeliveryDate: new Date(),
      deliveryHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).subscriptions.set('sub-1', subscription);
    });

    it('should pause subscription successfully', async () => {
      const result = await service.pause('sub-1', 'user-id');

      expect(result.status).toBe(SubscriptionStatus.PAUSED);
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      await expect(service.pause('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to pause another user subscription', async () => {
      await expect(service.pause('sub-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-active subscription', async () => {
      const pausedSub = { ...subscription, status: SubscriptionStatus.PAUSED };
      (service as any).subscriptions.set('sub-1', pausedSub);

      await expect(service.pause('sub-1', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resume', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-id',
      productId: 'product-1',
      vendorId: 'vendor-1',
      frequency: SubscriptionFrequency.WEEKLY,
      quantity: 1,
      deliveryDays: ['monday'],
      startDate: new Date(),
      status: SubscriptionStatus.PAUSED,
      totalAmount: 100,
      nextDeliveryDate: new Date(),
      deliveryHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).subscriptions.set('sub-1', subscription);
    });

    it('should resume subscription successfully', async () => {
      const result = await service.resume('sub-1', 'user-id');

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.nextDeliveryDate).toBeDefined();
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      await expect(service.resume('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to resume another user subscription', async () => {
      await expect(service.resume('sub-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-paused subscription', async () => {
      const activeSub = { ...subscription, status: SubscriptionStatus.ACTIVE };
      (service as any).subscriptions.set('sub-1', activeSub);

      await expect(service.resume('sub-1', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAnalytics', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-id',
      productId: 'product-1',
      vendorId: 'vendor-1',
      frequency: SubscriptionFrequency.WEEKLY,
      quantity: 1,
      deliveryDays: ['monday'],
      startDate: new Date(),
      status: SubscriptionStatus.ACTIVE,
      totalAmount: 100,
      nextDeliveryDate: new Date(),
      deliveryHistory: [
        { date: new Date(), status: 'delivered' },
        { date: new Date(), status: 'delivered' },
        { date: new Date(), status: 'late' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).subscriptions.set('sub-1', subscription);
    });

    it('should return analytics for subscription', async () => {
      const result = await service.getAnalytics('sub-1', 'user-id');

      expect(result).toHaveProperty('total_deliveries', 3);
      expect(result).toHaveProperty('on_time_rate', 66.67);
      expect(result).toHaveProperty('average_cost', 100);
      expect(result).toHaveProperty('next_delivery');
      expect(result).toHaveProperty('savings_vs_one_time', 45);
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      await expect(service.getAnalytics('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to view another user analytics', async () => {
      await expect(service.getAnalytics('sub-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateNextDeliveryDate', () => {
    it('should calculate next daily delivery date', () => {
      const startDate = new Date('2024-01-01');
      const result = (service as any).calculateNextDeliveryDate(
        startDate,
        SubscriptionFrequency.DAILY,
      );

      expect(result.getDate()).toBe(2); // Next day
    });

    it('should calculate next weekly delivery date', () => {
      const startDate = new Date('2024-01-01');
      const result = (service as any).calculateNextDeliveryDate(
        startDate,
        SubscriptionFrequency.WEEKLY,
      );

      expect(result.getDate()).toBe(8); // 7 days later
    });

    it('should calculate next custom delivery date', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const result = (service as any).calculateNextDeliveryDate(
        startDate,
        SubscriptionFrequency.CUSTOM,
        ['wednesday', 'friday'],
      );

      expect(result.getDay()).toBe(3); // Wednesday
    });
  });

  describe('getDefaultDeliveryDays', () => {
    it('should return all days for daily frequency', () => {
      const result = (service as any).getDefaultDeliveryDays(SubscriptionFrequency.DAILY);

      expect(result).toHaveLength(7);
      expect(result).toContain('monday');
      expect(result).toContain('sunday');
    });

    it('should return monday for weekly frequency', () => {
      const result = (service as any).getDefaultDeliveryDays(SubscriptionFrequency.WEEKLY);

      expect(result).toEqual(['monday']);
    });

    it('should return multiple days for custom frequency', () => {
      const result = (service as any).getDefaultDeliveryDays(SubscriptionFrequency.CUSTOM);

      expect(result).toEqual(['monday', 'wednesday', 'friday']);
    });
  });
});