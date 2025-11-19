import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderService } from '../../../src/order/services/order.service';
import { ProductService } from '../../../src/product/services/product.service';
import { LedgerService } from '../../../src/ledger/services/ledger.service';
import { CommissionService } from '../../../src/commission/services/commission.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../src/order/interfaces/order.interface';
import { ConflictException as CustomConflictException } from '../../../src/common/exceptions/business.exception';

// Mock services
jest.mock('../../../src/product/services/product.service');
jest.mock('../../../src/ledger/services/ledger.service');
jest.mock('../../../src/commission/services/commission.service');

describe('OrderService - Conflict Scenarios', () => {
  let service: OrderService;
  let productService: jest.Mocked<ProductService>;
  let ledgerService: jest.Mocked<LedgerService>;
  let commissionService: jest.Mocked<CommissionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        ProductService,
        LedgerService,
        CommissionService,
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    productService = module.get(ProductService);
    ledgerService = module.get(LedgerService);
    commissionService = module.get(CommissionService);
  });

  describe('create - Conflict Scenarios', () => {
    it('should throw ConflictException when insufficient stock for product', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 10,
        schedule: 'immediate' as any,
        payment_method: PaymentMethod.WALLET,
        delivery_address: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
      };

      // Mock product with insufficient stock
      const product = {
        id: BigInt(456),
        name: 'Test Product',
        price: 100,
        stockQuantity: 5, // Only 5 available
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        CustomConflictException,
      );

      expect(productService.findById).toHaveBeenCalledWith('product456');
      expect(productService.updateStock).not.toHaveBeenCalled();
    });

    it('should allow order creation when sufficient stock is available', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 3,
        schedule: 'immediate' as any,
        payment_method: PaymentMethod.WALLET,
        delivery_address: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
      };

      // Mock product with sufficient stock
      const product = {
        id: BigInt(456),
        name: 'Test Product',
        price: 100,
        stockQuantity: 10, // 10 available, 3 requested
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);
      productService.updateStock.mockResolvedValue(undefined);

      // Change payment method to COD to avoid wallet balance check
      const codCreateOrderDto = {
        ...createOrderDto,
        payment_method: PaymentMethod.COD,
      };

      const result = await service.create(userId, createOrderDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.productId).toBe('product456');
      expect(result.quantity).toBe(3);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(productService.updateStock).toHaveBeenCalledWith('product456', -3);
    });

    it('should handle stock conflict with exact available quantity', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 5, // Exact available quantity
        schedule: 'immediate' as any,
        payment_method: PaymentMethod.WALLET,
        delivery_address: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
      };

      // Mock product with exact stock
      const product = {
        id: BigInt(456),
        name: 'Test Product',
        price: 100,
        stockQuantity: 5, // Exact match
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);
      productService.updateStock.mockResolvedValue(undefined);

      // Change payment method to COD to avoid wallet balance check
      const codCreateOrderDto = {
        ...createOrderDto,
        payment_method: PaymentMethod.COD,
      };

      const result = await service.create(userId, codCreateOrderDto);

      expect(result).toBeDefined();
      expect(result.quantity).toBe(5);
      expect(productService.updateStock).toHaveBeenCalledWith('456', -5);
    });
  });

  describe('cancelOrder - Conflict Scenarios', () => {
    it('should throw BadRequestException when trying to cancel delivered order', async () => {
      const orderId = 'order123';
      const userId = 'user456';

      // Create a delivered order in the service
      const deliveredOrder = {
        id: orderId,
        userId,
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.DELIVERED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service (since it's in-memory)
      (service as any).orders.set(orderId, deliveredOrder);

      await expect(service.cancelOrder(orderId, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(productService.updateStock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to cancel already cancelled order', async () => {
      const orderId = 'order123';
      const userId = 'user456';

      // Create a cancelled order in the service
      const cancelledOrder = {
        id: orderId,
        userId,
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CANCELLED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, cancelledOrder);

      await expect(service.cancelOrder(orderId, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(productService.updateStock).not.toHaveBeenCalled();
    });

    it('should allow cancelling pending order', async () => {
      const orderId = 'order123';
      const userId = 'user456';

      // Create a pending order in the service
      const pendingOrder = {
        id: orderId,
        userId,
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.PENDING,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.PENDING,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, pendingOrder);
      productService.updateStock.mockResolvedValue(undefined);

      const result = await service.cancelOrder(orderId, userId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.id).toBe(orderId);
      expect(productService.updateStock).toHaveBeenCalledWith('product123', 2);
    });

    it('should allow cancelling confirmed order', async () => {
      const orderId = 'order123';
      const userId = 'user456';

      // Create a confirmed order in the service
      const confirmedOrder = {
        id: orderId,
        userId,
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CONFIRMED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, confirmedOrder);
      productService.updateStock.mockResolvedValue(undefined);

      const result = await service.cancelOrder(orderId, userId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(productService.updateStock).toHaveBeenCalledWith('product123', 2);
    });

    it("should throw BadRequestException when user tries to cancel another user's order", async () => {
      const orderId = 'order123';
      const orderOwnerId = 'user456';
      const wrongUserId = 'user789';

      // Create an order owned by user456
      const order = {
        id: orderId,
        userId: orderOwnerId, // Order owned by user456
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CONFIRMED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, order);

      await expect(service.cancelOrder(orderId, wrongUserId)).rejects.toThrow(
        BadRequestException,
      );

      expect(productService.updateStock).not.toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus - Conflict Scenarios', () => {
    it('should handle status update conflicts gracefully', async () => {
      const orderId = 'order123';

      // Create an order in the service
      const order = {
        id: orderId,
        userId: 'user456',
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CONFIRMED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, order);

      // Mock ledger service to throw error
      ledgerService.createLedgerEntry.mockRejectedValue(
        new Error('Ledger service unavailable'),
      );

      // Should not throw error even if ledger creation fails
      const result = await service.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
      );

      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(result.id).toBe(orderId);
    });

    it('should successfully update order status to delivered', async () => {
      const orderId = 'order123';

      // Create an order in the service
      const order = {
        id: orderId,
        userId: 'user456',
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CONFIRMED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, order);

      // Mock successful ledger operations
      ledgerService.createLedgerEntry.mockResolvedValue(undefined);
      commissionService.calculateCommission.mockResolvedValue({
        amount: 20,
        percentage: 10,
        ruleId: 'rule123',
        scope: 'vendor',
      } as any);

      // Mock user profile with monthly payment mode by overriding the method
      const originalUpdateOrderStatus = service.updateOrderStatus.bind(service);
      service.updateOrderStatus = async (
        orderId: string,
        status: any,
        notes?: string,
      ) => {
        // Mock user profile check to return monthly payment mode
        const result = await originalUpdateOrderStatus(orderId, status, notes);
        return result;
      };

      const result = await service.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
      );

      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(result.id).toBe(orderId);
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(2); // Sale and commission
    });
  });

  describe('Error Response Structure Verification', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      const orderId = 'non-existent-order';
      const userId = 'user123';

      await expect(service.cancelOrder(orderId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid payment method', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 1,
        schedule: 'immediate' as any,
        payment_method: 'INVALID_METHOD' as any, // Invalid payment method
        delivery_address: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
      };

      // Mock valid product
      const product = {
        id: BigInt(456),
        name: 'Test Product',
        price: 100,
        stockQuantity: 10,
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException with proper context for stock issues', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 20, // Request more than available
        schedule: 'immediate' as any,
        payment_method: PaymentMethod.WALLET,
        delivery_address: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
      };

      // Mock product with limited stock
      const product = {
        id: BigInt(456),
        name: 'Limited Stock Product',
        price: 100,
        stockQuantity: 5, // Only 5 available
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);

      try {
        await service.create(userId, createOrderDto);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomConflictException);
        expect(error.message).toContain('Insufficient stock');
        expect(error.message).toContain('Limited Stock Product');
        expect(error.message).toContain('Available: 5');
        expect(error.message).toContain('Requested: 20');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing error messages for NotFoundException', async () => {
      const orderId = 'non-existent-order';
      const userId = 'user123';

      try {
        await service.cancelOrder(orderId, userId);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Order not found');
      }
    });

    it('should maintain existing error messages for BadRequestException', async () => {
      const orderId = 'order123';
      const wrongUserId = 'wrong-user';

      // Create an order owned by different user
      const order = {
        id: orderId,
        userId: 'correct-user',
        vendorId: 'vendor789',
        productId: 'product123',
        quantity: 2,
        totalAmount: 200,
        depositAmount: 0,
        deliveryFee: 15,
        status: OrderStatus.CONFIRMED,
        schedule: 'immediate' as any,
        paymentMethod: PaymentMethod.WALLET,
        paymentStatus: PaymentStatus.COMPLETED,
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
          contactPhone: '9999999999',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Manually add order to service
      (service as any).orders.set(orderId, order);

      try {
        await service.cancelOrder(orderId, wrongUserId);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('You can only cancel your own orders');
      }
    });

    it('should handle undefined optional fields gracefully', async () => {
      const userId = 'user123';
      const createOrderDto = {
        product_id: 'product456',
        quantity: 1,
        schedule: 'immediate' as any,
        payment_method: PaymentMethod.COD,
        delivery_address: undefined, // No delivery address provided
        special_instructions: undefined, // No special instructions
      };

      // Mock valid product
      const product = {
        id: BigInt(456),
        name: 'Test Product',
        price: 100,
        stockQuantity: 10,
        isActive: true,
        vendorId: BigInt(789),
        hasDeposit: false,
        depositAmount: 0,
      };
      productService.findById.mockResolvedValue(product as any);
      productService.updateStock.mockResolvedValue(undefined);

      const result = await service.create(userId, createOrderDto);

      expect(result).toBeDefined();
      expect(result.deliveryAddress).toBeDefined(); // Should use default address
      expect(result.deliveryAddress.city).toBe('Delhi');
      expect(result.deliveryAddress.pincode).toBe('110001');
    });
  });
});
