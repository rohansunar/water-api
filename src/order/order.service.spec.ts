import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { ProductService } from '../product/product.service';
import { UserService } from '../modules/user/services/user.service';
import { LedgerService } from '../ledger/ledger.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../common/interfaces/order.interface';

describe('OrderService', () => {
  let service: OrderService;
  let productService: any;
  let userService: any;
  let ledgerService: any;

  beforeEach(async () => {
    productService = {
      findById: jest.fn(),
      updateStock: jest.fn(),
    };

    userService = {
      getUserProfile: jest.fn(),
      updateWalletBalance: jest.fn(),
    };

    ledgerService = {
      createLedgerEntry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: ProductService,
          useValue: productService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: LedgerService,
          useValue: ledgerService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockProduct = {
      id: 'product-id',
      vendorId: 'vendor-id',
      price: 100,
      stockQuantity: 10,
      isActive: true,
      hasDeposit: true,
      depositAmount: 50,
    };

    const mockUserProfile = {
      id: 'user-id',
      phone: '+1234567890',
      walletBalance: 1000,
      monthlyPaymentMode: false,
      addresses: [
        {
          id: 'addr-1',
          street: '123 Main St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          isDefault: true,
        },
      ],
    };

    const createOrderDto = {
      product_id: 'product-id',
      quantity: 2,
      schedule: 'once' as any,
      payment_method: PaymentMethod.WALLET,
      delivery_time: new Date().toISOString(),
      special_instructions: 'Handle with care',
    };

    beforeEach(() => {
      productService.findById.mockResolvedValue(mockProduct);
      userService.getUserProfile.mockResolvedValue(mockUserProfile);
      productService.updateStock.mockResolvedValue(undefined);
      userService.updateWalletBalance.mockResolvedValue(undefined);
    });

    it('should create order successfully with wallet payment', async () => {
      const result = await service.create('user-id', createOrderDto);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe('user-id');
      expect(result.vendorId).toBe('vendor-id');
      expect(result.productId).toBe('product-id');
      expect(result.quantity).toBe(2);
      expect(result.totalAmount).toBe(315); // 200 + 100 + 15
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);

      expect(productService.updateStock).toHaveBeenCalledWith('product-id', -2);
      expect(userService.updateWalletBalance).toHaveBeenCalledWith('user-id', -315);
    });

    it('should create order with COD payment', async () => {
      const codDto = { ...createOrderDto, payment_method: PaymentMethod.COD };

      const result = await service.create('user-id', codDto);

      expect(result.paymentMethod).toBe(PaymentMethod.COD);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(userService.updateWalletBalance).not.toHaveBeenCalled();
    });

    it('should create order with custom delivery address', async () => {
      const customAddress = {
        street: '456 Custom St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        latitude: 19.076,
        longitude: 72.8777,
        contactPhone: '+1234567890',
      };
      const dtoWithAddress = { ...createOrderDto, delivery_address: customAddress };

      const result = await service.create('user-id', dtoWithAddress);

      expect(result.deliveryAddress).toEqual(customAddress);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productService.findById.mockResolvedValue(null);

      await expect(service.create('user-id', createOrderDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for inactive product', async () => {
      productService.findById.mockResolvedValue({ ...mockProduct, isActive: false });

      await expect(service.create('user-id', createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      productService.findById.mockResolvedValue({ ...mockProduct, stockQuantity: 1 });

      await expect(service.create('user-id', createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userService.getUserProfile.mockResolvedValue(null);

      await expect(service.create('user-id', createOrderDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for insufficient wallet balance', async () => {
      userService.getUserProfile.mockResolvedValue({ ...mockUserProfile, walletBalance: 100 });

      await expect(service.create('user-id', createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle product without deposit', async () => {
      productService.findById.mockResolvedValue({ ...mockProduct, hasDeposit: false, depositAmount: 0 });

      const result = await service.create('user-id', createOrderDto);

      expect(result.totalAmount).toBe(215); // 200 + 0 + 15
    });
  });

  describe('findByUser', () => {
    it('should return user orders sorted by creation date', async () => {
      // Create some orders manually for testing
      const order1 = {
        id: 'order-1',
        userId: 'user-id',
        vendorId: 'vendor-1',
        productId: 'product-1',
        quantity: 1,
        totalAmount: 100,
        status: OrderStatus.CONFIRMED,
        schedule: 'once' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {},
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      const order2 = {
        id: 'order-2',
        userId: 'user-id',
        vendorId: 'vendor-2',
        productId: 'product-2',
        quantity: 2,
        totalAmount: 200,
        status: OrderStatus.DELIVERED,
        schedule: 'once' as any,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {},
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date(),
      };

      // Manually add to service's internal storage
      (service as any).orders.set('order-1', order1);
      (service as any).orders.set('order-2', order2);
      (service as any).userOrderIndex.set('user-id', ['order-1', 'order-2']);

      const result = await service.findByUser('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-2'); // Newest first
      expect(result[1].id).toBe('order-1');
    });

    it('should return empty array for user with no orders', async () => {
      const result = await service.findByUser('user-without-orders');

      expect(result).toEqual([]);
    });
  });

  describe('findByVendor', () => {
    it('should return vendor orders sorted by creation date', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-id',
        vendorId: 'vendor-id',
        productId: 'product-1',
        quantity: 1,
        totalAmount: 100,
        status: OrderStatus.CONFIRMED,
        schedule: 'once' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).orders.set('order-1', order);
      (service as any).vendorOrderIndex.set('vendor-id', ['order-1']);

      const result = await service.findByVendor('vendor-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-1');
    });
  });

  describe('findById', () => {
    it('should return order if found', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-id',
        vendorId: 'vendor-id',
        productId: 'product-1',
        quantity: 1,
        totalAmount: 100,
        status: OrderStatus.CONFIRMED,
        schedule: 'once' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (service as any).orders.set('order-1', order);

      const result = await service.findById('order-1');

      expect(result).toEqual(order);
    });

    it('should return null if order not found', async () => {
      const result = await service.findById('non-existent-order');

      expect(result).toBeNull();
    });
  });

  describe('cancelOrder', () => {
    const order = {
      id: 'order-1',
      userId: 'user-id',
      vendorId: 'vendor-id',
      productId: 'product-1',
      quantity: 2,
      totalAmount: 200,
      status: OrderStatus.CONFIRMED,
      schedule: 'once' as any,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.COMPLETED,
      deliveryAddress: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).orders.set('order-1', order);
      productService.updateStock.mockResolvedValue(undefined);
      userService.updateWalletBalance.mockResolvedValue(undefined);
    });

    it('should cancel order successfully and process refund', async () => {
      const result = await service.cancelOrder('order-1', 'user-id');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.id).toBe('order-1');
      expect(productService.updateStock).toHaveBeenCalledWith('product-1', 2);
      expect(userService.updateWalletBalance).toHaveBeenCalledWith('user-id', 200);
    });

    it('should cancel order without refund if payment not completed', async () => {
      const pendingOrder = { ...order, paymentStatus: PaymentStatus.PENDING, status: OrderStatus.PENDING };
      (service as any).orders.set('order-1', pendingOrder);

      await service.cancelOrder('order-1', 'user-id');

      expect(userService.updateWalletBalance).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.cancelOrder('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user tries to cancel another user order', async () => {
      await expect(service.cancelOrder('order-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for delivered order', async () => {
      const deliveredOrder = { ...order, status: OrderStatus.DELIVERED };
      (service as any).orders.set('order-1', deliveredOrder);

      await expect(service.cancelOrder('order-1', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already cancelled order', async () => {
      const cancelledOrder = { ...order, status: OrderStatus.CANCELLED };
      (service as any).orders.set('order-1', cancelledOrder);

      await expect(service.cancelOrder('order-1', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    const order = {
      id: 'order-1',
      userId: 'user-id',
      vendorId: 'vendor-id',
      productId: 'product-1',
      quantity: 1,
      totalAmount: 100,
      status: OrderStatus.CONFIRMED,
      schedule: 'once' as any,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.COMPLETED,
      deliveryAddress: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).orders.set('order-1', order);
      userService.getUserProfile.mockResolvedValue({
        id: 'user-id',
        monthlyPaymentMode: true,
      });
      ledgerService.createLedgerEntry.mockResolvedValue(undefined);
    });

    it('should update order status successfully', async () => {
      const result = await service.updateOrderStatus('order-1', OrderStatus.OUT_FOR_DELIVERY, 'Out for delivery');

      expect(result.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

      // Check internal order object for tracking info
      const internalOrder = (service as any).orders.get('order-1');
      expect(internalOrder.trackingInfo).toBeDefined();
      expect(internalOrder.trackingInfo.statusHistory).toHaveLength(1);
      expect(internalOrder.trackingInfo.statusHistory[0].status).toBe(OrderStatus.OUT_FOR_DELIVERY);
      expect(internalOrder.trackingInfo.statusHistory[0].notes).toBe('Out for delivery');
    });

    it('should create ledger entry when order is delivered and user has monthly payment mode', async () => {
      await service.updateOrderStatus('order-1', OrderStatus.DELIVERED);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith({
        vendorId: 'vendor-id',
        orderId: 'order-1',
        userId: 'user-id',
        amount: 100,
        type: 'sale',
        description: 'Order delivery - 1 items',
      });
    });

    it('should not create ledger entry if user does not have monthly payment mode', async () => {
      userService.getUserProfile.mockResolvedValue({
        id: 'user-id',
        monthlyPaymentMode: false,
      });

      await service.updateOrderStatus('order-1', OrderStatus.DELIVERED);

      expect(ledgerService.createLedgerEntry).not.toHaveBeenCalled();
    });

    it('should handle ledger creation errors gracefully', async () => {
      ledgerService.createLedgerEntry.mockRejectedValue(new Error('Ledger error'));

      const result = await service.updateOrderStatus('order-1', OrderStatus.DELIVERED);

      expect(result.status).toBe(OrderStatus.DELIVERED);
      // Should not throw error
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.updateOrderStatus('non-existent', OrderStatus.DELIVERED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processPayment', () => {
    it('should set payment status to COMPLETED for wallet payment', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      } as any;

      await (service as any).processPayment(order);

      expect(order.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should set payment status to PENDING for COD payment', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      } as any;

      await (service as any).processPayment(order);

      expect(order.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('should throw BadRequestException for invalid payment method', async () => {
      const order = {
        id: 'order-1',
        paymentMethod: 'invalid' as any,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
      } as any;

      await expect((service as any).processPayment(order)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should return default delivery fee', () => {
      const fee = (service as any).calculateDeliveryFee('vendor-id');

      expect(fee).toBe(15);
    });
  });

  describe('getDefaultAddress', () => {
    it('should return user default address', () => {
      const userProfile = {
        phone: '+1234567890',
        addresses: [
          {
            street: '123 Main St',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            latitude: 28.6139,
            longitude: 77.209,
            isDefault: true,
          },
        ],
      };

      const address = (service as any).getDefaultAddress(userProfile);

      expect(address.street).toBe('123 Main St');
      expect(address.contactPhone).toBe('+1234567890');
    });

    it('should return default address if no user address', () => {
      const userProfile = {
        phone: '+1234567890',
        addresses: [],
      };

      const address = (service as any).getDefaultAddress(userProfile);

      expect(address.street).toBe('123 Default Street');
      expect(address.city).toBe('Delhi');
      expect(address.contactPhone).toBe('+1234567890');
    });
  });
});
