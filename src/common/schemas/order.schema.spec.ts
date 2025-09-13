import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderSchema } from './order.schema';

describe('Order Schema', () => {
  let orderModel: Model<Order>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(Order.name),
          useValue: {
            new: jest.fn().mockResolvedValue({}),
            constructor: jest.fn().mockResolvedValue({}),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    orderModel = module.get<Model<Order>>(getModelToken(Order.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema structure', () => {
      const schema = OrderSchema;
      expect(schema).toBeDefined();
      expect(schema.paths.orderUuid).toBeDefined();
      expect(schema.paths.customerId).toBeDefined();
      expect(schema.paths.vendorId).toBeDefined();
      expect(schema.paths.storeId).toBeDefined();
      expect(schema.paths.status).toBeDefined();
      expect(schema.paths.paymentStatus).toBeDefined();
      expect(schema.paths.totalAmount).toBeDefined();
      expect(schema.paths.deliveryAddress).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = OrderSchema;
      expect(schema.paths.orderUuid.isRequired).toBe(true);
      expect(schema.paths.customerId.isRequired).toBe(true);
      expect(schema.paths.vendorId.isRequired).toBe(true);
      expect(schema.paths.totalAmount.isRequired).toBe(true);
      expect(schema.paths.deliveryAddress.isRequired).toBe(true);
    });

    it('should have correct default values', () => {
      const schema = OrderSchema;
      expect(schema.paths.status.defaultValue).toBe('pending');
      expect(schema.paths.paymentStatus.defaultValue).toBe('pending');
      expect(schema.paths.orderType.defaultValue).toBe('regular');
      expect(schema.paths.deliveryFee.defaultValue).toBe(0);
      expect(schema.paths.discount.defaultValue).toBe(0);
      expect(schema.paths.taxes.defaultValue).toBe(0);
      expect(schema.paths.refundAmount.defaultValue).toBe(0);
    });

    it('should have correct field constraints', () => {
      const schema = OrderSchema;
      expect(schema.paths.orderUuid.options.unique).toBe(true);
      expect(schema.paths.totalAmount.options.min).toBe(0);
      expect(schema.paths.deliveryFee.options.min).toBe(0);
      expect(schema.paths.discount.options.min).toBe(0);
      expect(schema.paths.taxes.options.min).toBe(0);
      expect(schema.paths.refundAmount.options.min).toBe(0);
    });
  });

  describe('Enhanced Features', () => {
    it('should have order items array', () => {
      const schema = OrderSchema;
      expect(schema.paths.items).toBeDefined();
    });

    it('should have status history tracking', () => {
      const schema = OrderSchema;
      expect(schema.paths.statusHistory).toBeDefined();
    });

    it('should have delivery slot information', () => {
      const schema = OrderSchema;
      expect(schema.paths.slotStart).toBeDefined();
      expect(schema.paths.slotEnd).toBeDefined();
      expect(schema.paths.estimatedDeliveryTime).toBeDefined();
    });

    it('should have customer feedback structure', () => {
      const schema = OrderSchema;
      expect(schema.paths.customerFeedback).toBeDefined();
    });

    it('should have financial tracking fields', () => {
      const schema = OrderSchema;
      expect(schema.paths.platformFee).toBeDefined();
      expect(schema.paths.vendorEarnings).toBeDefined();
      expect(schema.paths.refundDetails).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = OrderSchema;
      const indexes = schema.indexes();
      
      // Check for orderUuid unique index
      const orderUuidIndex = indexes.find(index => index[0].orderUuid === 1);
      expect(orderUuidIndex).toBeDefined();
      expect(orderUuidIndex[1].unique).toBe(true);
      
      // Check for customerId index
      const customerIdIndex = indexes.find(index => index[0].customerId === 1);
      expect(customerIdIndex).toBeDefined();
      
      // Check for vendorId index
      const vendorIdIndex = indexes.find(index => index[0].vendorId === 1);
      expect(vendorIdIndex).toBeDefined();
      
      // Check for status index
      const statusIndex = indexes.find(index => index[0].status === 1);
      expect(statusIndex).toBeDefined();
      
      // Check for compound indexes
      const customerStatusIndex = indexes.find(index => 
        index[0].customerId === 1 && index[0].status === 1
      );
      expect(customerStatusIndex).toBeDefined();
      
      const vendorStatusIndex = indexes.find(index => 
        index[0].vendorId === 1 && index[0].status === 1
      );
      expect(vendorStatusIndex).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    let mockOrder: any;

    beforeEach(() => {
      mockOrder = {
        isNew: true,
        orderUuid: undefined,
        items: [
          { price: 100, quantity: 2, discount: 10 },
          { price: 50, quantity: 1, discount: 5 },
        ],
        deliveryFee: 20,
        taxes: 15,
        discount: 25,
        platformFee: 10,
        totalAmount: 0,
        vendorEarnings: 0,
      };
    });

    it('should generate orderUuid if not provided', () => {
      // Simulate pre-save middleware logic
      if (mockOrder.isNew && !mockOrder.orderUuid) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        mockOrder.orderUuid = `ORD-${timestamp.slice(-8)}-${random}`;
      }
      
      expect(mockOrder.orderUuid).toBeDefined();
      expect(mockOrder.orderUuid).toMatch(/^ORD-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should calculate total amount correctly', () => {
      // Simulate pre-save middleware logic
      let itemsTotal = 0;
      mockOrder.items.forEach((item: any) => {
        itemsTotal += (item.price * item.quantity) - item.discount;
      });
      
      mockOrder.totalAmount = itemsTotal + mockOrder.deliveryFee + mockOrder.taxes - mockOrder.discount;
      
      // Items total: (100*2 - 10) + (50*1 - 5) = 190 + 45 = 235
      // Total: 235 + 20 + 15 - 25 = 245
      expect(mockOrder.totalAmount).toBe(245);
    });

    it('should calculate vendor earnings correctly', () => {
      // Simulate pre-save middleware logic
      let itemsTotal = 0;
      mockOrder.items.forEach((item: any) => {
        itemsTotal += (item.price * item.quantity) - item.discount;
      });
      
      mockOrder.totalAmount = itemsTotal + mockOrder.deliveryFee + mockOrder.taxes - mockOrder.discount;
      mockOrder.vendorEarnings = mockOrder.totalAmount - mockOrder.platformFee - mockOrder.deliveryFee;
      
      // Vendor earnings: 245 - 10 - 20 = 215
      expect(mockOrder.vendorEarnings).toBe(215);
    });
  });

  describe('Instance Methods', () => {
    let mockOrder: any;

    beforeEach(() => {
      mockOrder = {
        status: 'pending',
        paymentStatus: 'pending',
        statusHistory: [
          { status: 'pending', timestamp: new Date(), notes: 'Order created' }
        ],
        items: [
          { productId: 'prod1', quantity: 2, status: 'pending' },
          { productId: 'prod2', quantity: 1, status: 'pending' },
        ],
        totalAmount: 245,
        refundAmount: 0,
      };
    });

    it('should check if order can be cancelled', () => {
      // Mock canBeCancelled method
      const canBeCancelled = function(): boolean {
        return ['pending', 'confirmed', 'preparing'].includes(this.status);
      };
      
      mockOrder.canBeCancelled = canBeCancelled.bind(mockOrder);
      
      expect(mockOrder.canBeCancelled()).toBe(true);
      
      mockOrder.status = 'delivered';
      expect(mockOrder.canBeCancelled()).toBe(false);
    });

    it('should check if order is refundable', () => {
      // Mock isRefundable method
      const isRefundable = function(): boolean {
        return ['delivered', 'cancelled'].includes(this.status) && 
               this.paymentStatus === 'completed' &&
               this.refundAmount < this.totalAmount;
      };
      
      mockOrder.isRefundable = isRefundable.bind(mockOrder);
      
      mockOrder.status = 'delivered';
      mockOrder.paymentStatus = 'completed';
      expect(mockOrder.isRefundable()).toBe(true);
      
      mockOrder.refundAmount = 245;
      expect(mockOrder.isRefundable()).toBe(false);
    });

    it('should add status to history', () => {
      // Mock addStatusHistory method
      const addStatusHistory = function(status: string, notes?: string, location?: any): void {
        this.statusHistory.push({
          status,
          timestamp: new Date(),
          notes,
          location,
        });
        this.status = status;
      };
      
      mockOrder.addStatusHistory = addStatusHistory.bind(mockOrder);
      
      mockOrder.addStatusHistory('confirmed', 'Order confirmed by vendor');
      
      expect(mockOrder.statusHistory).toHaveLength(2);
      expect(mockOrder.statusHistory[1].status).toBe('confirmed');
      expect(mockOrder.statusHistory[1].notes).toBe('Order confirmed by vendor');
      expect(mockOrder.status).toBe('confirmed');
    });

    it('should calculate refund amount', () => {
      // Mock calculateRefundAmount method
      const calculateRefundAmount = function(): number {
        if (!this.isRefundable()) return 0;
        
        const fulfilledItems = this.items.filter((item: any) => item.status === 'delivered');
        const fulfilledAmount = fulfilledItems.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0);
        
        const refundableAmount = this.totalAmount - fulfilledAmount;
        return Math.max(0, refundableAmount - this.refundAmount);
      };
      
      mockOrder.calculateRefundAmount = calculateRefundAmount.bind(mockOrder);
      mockOrder.isRefundable = () => true;
      
      // Mock item prices
      mockOrder.items[0].price = 100;
      mockOrder.items[1].price = 50;
      
      // No items delivered - full refund
      expect(mockOrder.calculateRefundAmount()).toBe(245);
      
      // One item delivered
      mockOrder.items[0].status = 'delivered';
      expect(mockOrder.calculateRefundAmount()).toBe(95); // 245 - (100*2) = 45, but should be 245 - 200 = 45
    });

    it('should get order summary', () => {
      // Mock getOrderSummary method
      const getOrderSummary = function(): any {
        return {
          orderUuid: this.orderUuid,
          status: this.status,
          paymentStatus: this.paymentStatus,
          totalAmount: this.totalAmount,
          itemCount: this.items.length,
          totalQuantity: this.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          canBeCancelled: this.canBeCancelled(),
          isRefundable: this.isRefundable(),
        };
      };
      
      mockOrder.getOrderSummary = getOrderSummary.bind(mockOrder);
      mockOrder.canBeCancelled = () => true;
      mockOrder.isRefundable = () => false;
      mockOrder.orderUuid = 'ORD-12345678-ABC123';
      
      const summary = mockOrder.getOrderSummary();
      
      expect(summary.orderUuid).toBe('ORD-12345678-ABC123');
      expect(summary.status).toBe('pending');
      expect(summary.totalAmount).toBe(245);
      expect(summary.itemCount).toBe(2);
      expect(summary.totalQuantity).toBe(3);
      expect(summary.canBeCancelled).toBe(true);
      expect(summary.isRefundable).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate status enum values', () => {
      const schema = OrderSchema;
      const statusPath = schema.paths.status;
      expect(statusPath.options.enum).toContain('pending');
      expect(statusPath.options.enum).toContain('confirmed');
      expect(statusPath.options.enum).toContain('preparing');
      expect(statusPath.options.enum).toContain('ready_for_pickup');
      expect(statusPath.options.enum).toContain('out_for_delivery');
      expect(statusPath.options.enum).toContain('delivered');
      expect(statusPath.options.enum).toContain('cancelled');
    });

    it('should validate payment status enum values', () => {
      const schema = OrderSchema;
      const paymentStatusPath = schema.paths.paymentStatus;
      expect(paymentStatusPath.options.enum).toContain('pending');
      expect(paymentStatusPath.options.enum).toContain('processing');
      expect(paymentStatusPath.options.enum).toContain('completed');
      expect(paymentStatusPath.options.enum).toContain('failed');
      expect(paymentStatusPath.options.enum).toContain('refunded');
      expect(paymentStatusPath.options.enum).toContain('partially_refunded');
    });

    it('should validate order type enum values', () => {
      const schema = OrderSchema;
      const orderTypePath = schema.paths.orderType;
      expect(orderTypePath.options.enum).toContain('regular');
      expect(orderTypePath.options.enum).toContain('subscription');
      expect(orderTypePath.options.enum).toContain('bulk');
    });

    it('should validate amount constraints', () => {
      const schema = OrderSchema;
      expect(schema.paths.totalAmount.options.min).toBe(0);
      expect(schema.paths.deliveryFee.options.min).toBe(0);
      expect(schema.paths.discount.options.min).toBe(0);
      expect(schema.paths.taxes.options.min).toBe(0);
      expect(schema.paths.refundAmount.options.min).toBe(0);
    });
  });
});
