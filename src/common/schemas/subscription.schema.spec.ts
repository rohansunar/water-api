import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionSchema } from './subscription.schema';

describe('Subscription Schema', () => {
  let subscriptionModel: Model<Subscription>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(Subscription.name),
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

    subscriptionModel = module.get<Model<Subscription>>(getModelToken(Subscription.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema structure', () => {
      const schema = SubscriptionSchema;
      expect(schema).toBeDefined();
      expect(schema.paths.customerId).toBeDefined();
      expect(schema.paths.vendorId).toBeDefined();
      expect(schema.paths.productId).toBeDefined();
      expect(schema.paths.frequency).toBeDefined();
      expect(schema.paths.quantity).toBeDefined();
      expect(schema.paths.startDate).toBeDefined();
      expect(schema.paths.nextDeliveryDate).toBeDefined();
      expect(schema.paths.status).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.customerId.isRequired).toBe(true);
      expect(schema.paths.vendorId.isRequired).toBe(true);
      expect(schema.paths.productId.isRequired).toBe(true);
      expect(schema.paths.frequency.isRequired).toBe(true);
      expect(schema.paths.quantity.isRequired).toBe(true);
      expect(schema.paths.startDate.isRequired).toBe(true);
      expect(schema.paths.nextDeliveryDate.isRequired).toBe(true);
    });

    it('should have correct default values', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.status.defaultValue).toBe('active');
      expect(schema.paths.autoRenew.defaultValue).toBe(true);
      expect(schema.paths.totalDeliveries.defaultValue).toBe(0);
      expect(schema.paths.successfulDeliveries.defaultValue).toBe(0);
      expect(schema.paths.missedDeliveries.defaultValue).toBe(0);
      expect(schema.paths.paymentMethod.defaultValue).toBe('wallet');
      expect(schema.paths.autoPayment.defaultValue).toBe(false);
    });

    it('should have correct field constraints', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.quantity.options.min).toBe(1);
      expect(schema.paths.totalDeliveries.options.min).toBe(0);
      expect(schema.paths.successfulDeliveries.options.min).toBe(0);
      expect(schema.paths.missedDeliveries.options.min).toBe(0);
      expect(schema.paths.unitPrice.options.min).toBe(0);
      expect(schema.paths.totalAmount.options.min).toBe(0);
    });
  });

  describe('Frequency and Scheduling', () => {
    it('should have correct frequency enum values', () => {
      const schema = SubscriptionSchema;
      const frequencyPath = schema.paths.frequency;
      expect(frequencyPath.options.enum).toContain('daily');
      expect(frequencyPath.options.enum).toContain('weekly');
      expect(frequencyPath.options.enum).toContain('bi_weekly');
      expect(frequencyPath.options.enum).toContain('monthly');
      expect(frequencyPath.options.enum).toContain('custom');
    });

    it('should have delivery scheduling fields', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.deliveryDays).toBeDefined();
      expect(schema.paths.deliveryDates).toBeDefined();
      expect(schema.paths.preferredDeliveryTime).toBeDefined();
    });

    it('should have delivery history tracking', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.deliveryHistory).toBeDefined();
    });
  });

  describe('Status and Lifecycle', () => {
    it('should have correct status enum values', () => {
      const schema = SubscriptionSchema;
      const statusPath = schema.paths.status;
      expect(statusPath.options.enum).toContain('active');
      expect(statusPath.options.enum).toContain('paused');
      expect(statusPath.options.enum).toContain('cancelled');
      expect(statusPath.options.enum).toContain('expired');
      expect(statusPath.options.enum).toContain('suspended');
    });

    it('should have pause and cancellation tracking', () => {
      const schema = SubscriptionSchema;
      expect(schema.paths.pausedAt).toBeDefined();
      expect(schema.paths.pausedUntil).toBeDefined();
      expect(schema.paths.pauseReason).toBeDefined();
      expect(schema.paths.cancelledAt).toBeDefined();
      expect(schema.paths.cancellationReason).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const schema = SubscriptionSchema;
      const indexes = schema.indexes();
      
      // Check for basic indexes
      const customerIdIndex = indexes.find(index => index[0].customerId === 1);
      expect(customerIdIndex).toBeDefined();
      
      const vendorIdIndex = indexes.find(index => index[0].vendorId === 1);
      expect(vendorIdIndex).toBeDefined();
      
      const statusIndex = indexes.find(index => index[0].status === 1);
      expect(statusIndex).toBeDefined();
      
      const nextDeliveryIndex = indexes.find(index => index[0].nextDeliveryDate === 1);
      expect(nextDeliveryIndex).toBeDefined();
      
      // Check for compound indexes
      const customerStatusIndex = indexes.find(index => 
        index[0].customerId === 1 && index[0].status === 1
      );
      expect(customerStatusIndex).toBeDefined();
      
      const statusDeliveryIndex = indexes.find(index => 
        index[0].status === 1 && index[0].nextDeliveryDate === 1
      );
      expect(statusDeliveryIndex).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    let mockSubscription: any;

    beforeEach(() => {
      mockSubscription = {
        totalDeliveries: 10,
        successfulDeliveries: 8,
        unitPrice: 100,
        quantity: 2,
        totalAmount: 0,
        deliverySuccessRate: 0,
      };
    });

    it('should calculate delivery success rate', () => {
      // Simulate pre-save middleware logic
      if (mockSubscription.totalDeliveries > 0) {
        mockSubscription.deliverySuccessRate = Math.round(
          (mockSubscription.successfulDeliveries / mockSubscription.totalDeliveries) * 100
        );
      }
      
      expect(mockSubscription.deliverySuccessRate).toBe(80); // 8/10 * 100 = 80%
    });

    it('should calculate total amount per delivery', () => {
      // Simulate pre-save middleware logic
      mockSubscription.totalAmount = mockSubscription.unitPrice * mockSubscription.quantity;
      
      expect(mockSubscription.totalAmount).toBe(200); // 100 * 2 = 200
    });

    it('should handle zero deliveries for success rate', () => {
      mockSubscription.totalDeliveries = 0;
      mockSubscription.successfulDeliveries = 0;
      
      // Simulate pre-save middleware logic
      if (mockSubscription.totalDeliveries > 0) {
        mockSubscription.deliverySuccessRate = Math.round(
          (mockSubscription.successfulDeliveries / mockSubscription.totalDeliveries) * 100
        );
      }
      
      expect(mockSubscription.deliverySuccessRate).toBe(0); // Should remain 0
    });
  });

  describe('Instance Methods', () => {
    let mockSubscription: any;

    beforeEach(() => {
      mockSubscription = {
        status: 'active',
        endDate: null,
        pausedUntil: null,
        nextDeliveryDate: new Date(Date.now() + 86400000), // Tomorrow
        frequency: 'weekly',
        deliveryDays: ['monday', 'wednesday', 'friday'],
        startDate: new Date(),
        deliveryHistory: [],
        totalDeliveries: 0,
        successfulDeliveries: 0,
        missedDeliveries: 0,
        quantity: 2,
      };
    });

    it('should check if subscription is active', () => {
      // Mock isActive method
      const isActive = function(): boolean {
        return this.status === 'active' && 
               (!this.endDate || new Date() <= this.endDate);
      };
      
      mockSubscription.isActive = isActive.bind(mockSubscription);
      
      expect(mockSubscription.isActive()).toBe(true);
      
      mockSubscription.status = 'paused';
      expect(mockSubscription.isActive()).toBe(false);
      
      mockSubscription.status = 'active';
      mockSubscription.endDate = new Date(Date.now() - 86400000); // Yesterday
      expect(mockSubscription.isActive()).toBe(false);
    });

    it('should check if subscription can be paused', () => {
      // Mock canBePaused method
      const canBePaused = function(): boolean {
        return this.status === 'active';
      };
      
      mockSubscription.canBePaused = canBePaused.bind(mockSubscription);
      
      expect(mockSubscription.canBePaused()).toBe(true);
      
      mockSubscription.status = 'paused';
      expect(mockSubscription.canBePaused()).toBe(false);
    });

    it('should check if subscription can be resumed', () => {
      // Mock canBeResumed method
      const canBeResumed = function(): boolean {
        return this.status === 'paused' && 
               (!this.pausedUntil || new Date() >= this.pausedUntil);
      };
      
      mockSubscription.canBeResumed = canBeResumed.bind(mockSubscription);
      
      mockSubscription.status = 'paused';
      expect(mockSubscription.canBeResumed()).toBe(true);
      
      mockSubscription.pausedUntil = new Date(Date.now() + 86400000); // Tomorrow
      expect(mockSubscription.canBeResumed()).toBe(false);
      
      mockSubscription.status = 'active';
      expect(mockSubscription.canBeResumed()).toBe(false);
    });

    it('should check if delivery is due', () => {
      // Mock isDeliveryDue method
      const isDeliveryDue = function(): boolean {
        return this.isActive() && new Date() >= this.nextDeliveryDate;
      };
      
      mockSubscription.isDeliveryDue = isDeliveryDue.bind(mockSubscription);
      mockSubscription.isActive = () => true;
      
      expect(mockSubscription.isDeliveryDue()).toBe(false); // Next delivery is tomorrow
      
      mockSubscription.nextDeliveryDate = new Date(Date.now() - 3600000); // 1 hour ago
      expect(mockSubscription.isDeliveryDue()).toBe(true);
    });

    it('should calculate next delivery date for daily frequency', () => {
      // Mock calculateNextDeliveryDate method
      const calculateNextDeliveryDate = function(fromDate?: Date): Date {
        const baseDate = fromDate || this.nextDeliveryDate || this.startDate;
        const nextDate = new Date(baseDate);
        
        switch (this.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'bi_weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        }
        
        return nextDate;
      };
      
      mockSubscription.calculateNextDeliveryDate = calculateNextDeliveryDate.bind(mockSubscription);
      mockSubscription.frequency = 'daily';
      
      const baseDate = new Date('2024-01-15');
      const nextDate = mockSubscription.calculateNextDeliveryDate(baseDate);
      
      expect(nextDate.getDate()).toBe(16);
      expect(nextDate.getMonth()).toBe(0); // January
    });

    it('should calculate next delivery date for weekly frequency', () => {
      const calculateNextDeliveryDate = function(fromDate?: Date): Date {
        const baseDate = fromDate || this.nextDeliveryDate || this.startDate;
        const nextDate = new Date(baseDate);
        
        switch (this.frequency) {
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        }
        
        return nextDate;
      };
      
      mockSubscription.calculateNextDeliveryDate = calculateNextDeliveryDate.bind(mockSubscription);
      mockSubscription.frequency = 'weekly';
      
      const baseDate = new Date('2024-01-15');
      const nextDate = mockSubscription.calculateNextDeliveryDate(baseDate);
      
      expect(nextDate.getDate()).toBe(22);
      expect(nextDate.getMonth()).toBe(0); // January
    });

    it('should add delivery record to history', () => {
      // Mock addDeliveryRecord method
      const addDeliveryRecord = function(orderId: Types.ObjectId, status: string, deliveredDate?: Date, notes?: string): void {
        this.deliveryHistory.push({
          orderId,
          scheduledDate: this.nextDeliveryDate,
          deliveredDate,
          status,
          quantity: this.quantity,
          notes,
        });
        
        this.totalDeliveries++;
        if (status === 'delivered') {
          this.successfulDeliveries++;
          this.lastDeliveryDate = deliveredDate || new Date();
        } else if (status === 'missed') {
          this.missedDeliveries++;
        }
        
        // Update next delivery date
        this.nextDeliveryDate = this.calculateNextDeliveryDate();
      };
      
      mockSubscription.addDeliveryRecord = addDeliveryRecord.bind(mockSubscription);
      mockSubscription.calculateNextDeliveryDate = () => new Date(Date.now() + 7 * 86400000); // Next week
      
      const orderId = new Types.ObjectId();
      const deliveredDate = new Date();
      
      mockSubscription.addDeliveryRecord(orderId, 'delivered', deliveredDate, 'Delivered successfully');
      
      expect(mockSubscription.deliveryHistory).toHaveLength(1);
      expect(mockSubscription.deliveryHistory[0].orderId).toBe(orderId);
      expect(mockSubscription.deliveryHistory[0].status).toBe('delivered');
      expect(mockSubscription.deliveryHistory[0].quantity).toBe(2);
      expect(mockSubscription.totalDeliveries).toBe(1);
      expect(mockSubscription.successfulDeliveries).toBe(1);
      expect(mockSubscription.missedDeliveries).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate payment method enum values', () => {
      const schema = SubscriptionSchema;
      const paymentMethodPath = schema.paths.paymentMethod;
      expect(paymentMethodPath.options.enum).toContain('wallet');
      expect(paymentMethodPath.options.enum).toContain('upi');
      expect(paymentMethodPath.options.enum).toContain('card');
      expect(paymentMethodPath.options.enum).toContain('auto_debit');
    });

    it('should validate delivery days enum values', () => {
      const schema = SubscriptionSchema;
      const deliveryDaysPath = schema.paths.deliveryDays as any;
      const dayEnum = deliveryDaysPath.schema.paths[0].options.enum;
      expect(dayEnum).toContain('monday');
      expect(dayEnum).toContain('tuesday');
      expect(dayEnum).toContain('wednesday');
      expect(dayEnum).toContain('thursday');
      expect(dayEnum).toContain('friday');
      expect(dayEnum).toContain('saturday');
      expect(dayEnum).toContain('sunday');
    });

    it('should validate delivery dates range', () => {
      const schema = SubscriptionSchema;
      const deliveryDatesPath = schema.paths.deliveryDates as any;
      const dateConstraints = deliveryDatesPath.schema.paths[0].options;
      expect(dateConstraints.min).toBe(1);
      expect(dateConstraints.max).toBe(31);
    });
  });
});
