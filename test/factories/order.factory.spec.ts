import { Order, OrderStatus, OrderSchedule, PaymentMethod, PaymentStatus, OrderAddress, TrackingInfo, StatusHistory } from '../../src/common/interfaces/order.interface';
import { UserFactory } from './user.factory.spec';

/**
 * Test factory for generating order test data
 * Provides consistent, realistic test data for order-related tests
 */
export class OrderFactory {
  /**
   * Generate a complete order object for testing
   */
  static createOrder(overrides: Partial<Order> = {}): Order {
    const customer = UserFactory.createCustomer();
    const defaultOrder: Order = {
      id: this.generateId(),
      userId: customer.id,
      vendorId: this.generateId(),
      productId: this.generateId(),
      quantity: this.generateQuantity(),
      totalAmount: this.generateTotalAmount(),
      depositAmount: this.generateDepositAmount(),
      deliveryFee: this.generateDeliveryFee(),
      status: OrderStatus.PENDING,
      schedule: OrderSchedule.INSTANT,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      deliveryAddress: this.generateDeliveryAddress(),
      deliveryRiderId: null,
      specialInstructions: this.generateSpecialInstructions(),
      trackingInfo: this.generateTrackingInfo(),
      createdAt: this.generatePastDate(),
      updatedAt: this.generateRecentDate(),
      ...overrides,
    };

    return defaultOrder;
  }

  /**
   * Generate a scheduled order
   */
  static createScheduledOrder(overrides: Partial<Order> = {}): Order {
    return this.createOrder({
      schedule: OrderSchedule.SCHEDULED,
      deliveryTime: this.generateScheduledDeliveryTime(),
      ...overrides,
    });
  }

  /**
   * Generate order with specific status
   */
  static createOrderWithStatus(status: OrderStatus, overrides: Partial<Order> = {}): Order {
    return this.createOrder({
      status,
      ...overrides,
    });
  }

  /**
   * Generate order with tracking information
   */
  static createOrderWithTracking(overrides: Partial<Order> = {}): Order {
    const order = this.createOrder(overrides);
    order.trackingInfo = this.generateTrackingInfo();
    return order;
  }

  /**
   * Generate multiple orders for testing
   */
  static createOrders(count: number, overrides: Partial<Order> = {}): Order[] {
    return Array.from({ length: count }, () => this.createOrder(overrides));
  }

  /**
   * Generate order for testing order updates
   */
  static createOrderForUpdate(overrides: Partial<Order> = {}): Order {
    const order = this.createOrder(overrides);
    order.status = OrderStatus.CONFIRMED;
    order.paymentStatus = PaymentStatus.COMPLETED;
    return order;
  }

  // Helper methods for generating test data
  private static generateId(): string {
    return `order-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateQuantity(): number {
    return Math.floor(Math.random() * 10) + 1;
  }

  private static generateTotalAmount(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  private static generateDepositAmount(): number {
    return Math.floor(Math.random() * 200) + 50;
  }

  private static generateDeliveryFee(): number {
    return Math.floor(Math.random() * 100) + 20;
  }

  private static generateDeliveryAddress(): OrderAddress {
    return {
      street: 'Test Delivery Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      landmark: 'Near Test Market',
      latitude: 28.6139,
      longitude: 77.2090,
      contactPhone: '+919876543210',
    };
  }

  private static generateSpecialInstructions(): string {
    const instructions = [
      'Please deliver carefully',
      'Call before delivery',
      'Leave at door if not available',
      'Handle with care',
      'Ring the bell twice',
    ];
    return instructions[Math.floor(Math.random() * instructions.length)];
  }

  private static generateTrackingInfo(): TrackingInfo {
    return {
      orderId: this.generateId(),
      currentStatus: OrderStatus.PENDING,
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          timestamp: this.generatePastDate(),
          notes: 'Order created',
          updatedBy: 'system',
        },
      ],
      estimatedDeliveryTime: this.generateScheduledDeliveryTime(),
    };
  }

  private static generateScheduledDeliveryTime(): Date {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)); // Within next 7 days
    return deliveryTime;
  }

  private static generatePastDate(): Date {
    return new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  }

  private static generateRecentDate(): Date {
    return new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
  }
}

/**
 * Test data builders for specific order test scenarios
 */
export class OrderTestData {
  /**
   * Generate test data for order creation
   */
  static getOrderCreationData(overrides: Partial<Order> = {}) {
    return {
      customerId: UserFactory.createCustomer().id,
      vendorId: OrderFactory['generateId'](),
      items: OrderFactory['generateOrderItems'](),
      deliveryAddress: OrderFactory['generateDeliveryAddress'](),
      scheduledDeliveryTime: OrderFactory['generateScheduledDeliveryTime'](),
      notes: OrderFactory['generateNotes'](),
      ...overrides,
    };
  }

  /**
   * Generate test data for order status update
   */
  static getOrderStatusUpdateData(overrides: Partial<Order> = {}) {
    return {
      status: OrderStatus.CONFIRMED,
      notes: 'Order confirmed by vendor',
      ...overrides,
    };
  }

  /**
   * Generate test data for order search filters
   */
  static getOrderSearchFilters() {
    return {
      status: OrderFactory['generateOrderStatus'](),
      schedule: OrderFactory['generateOrderSchedule'](),
      userId: UserFactory.createCustomer().id,
      vendorId: OrderFactory['generateId'](),
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
    };
  }

  /**
   * Generate invalid order data for validation testing
   */
  static getInvalidOrderData() {
    return {
      missingUserId: {},
      invalidStatus: { status: 'invalid-status' },
      negativeAmount: { totalAmount: -100 },
      invalidDeliveryTime: { deliveryTime: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Past time
    };
  }

  private static generateOrderStatus(): OrderStatus {
    const statuses = Object.values(OrderStatus);
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private static generateOrderSchedule(): OrderSchedule {
    const schedules = Object.values(OrderSchedule);
    return schedules[Math.floor(Math.random() * schedules.length)];
  }
}