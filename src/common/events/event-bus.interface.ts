/**
 * Event Bus Interface
 * Defines contracts for inter-module communication
 */

export interface IEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly data: any;
  readonly correlationId?: string;
}

export interface IEventHandler<T extends IEvent = IEvent> {
  handle(event: T): Promise<void>;
}

export interface IEventBus {
  publish<T extends IEvent>(event: T): Promise<void>;
  publishMany<T extends IEvent>(events: T[]): Promise<void>;
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): void;
  unsubscribe(eventType: string, handler: IEventHandler): void;
}

// Base event class
export abstract class BaseEvent implements IEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    public readonly eventType: string,
    public readonly source: string,
    public readonly data: any,
    correlationId?: string,
  ) {
    this.eventId = this.generateEventId();
    this.timestamp = new Date();
    this.correlationId = correlationId;
  }

  private generateEventId(): string {
    return `${this.eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Event decorator for handlers
export const EventHandler = (eventType: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('eventType', eventType, target, propertyKey);
    Reflect.defineMetadata('isEventHandler', true, target, propertyKey);
  };
};

// Common event types
export enum EventTypes {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Product events
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_STOCK_CHANGED = 'product.stock.changed',

  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_COMPLETED = 'order.completed',

  // Vendor events
  VENDOR_CREATED = 'vendor.created',
  VENDOR_APPROVED = 'vendor.approved',
  VENDOR_REJECTED = 'vendor.rejected',

  // Ledger events
  LEDGER_ENTRY_CREATED = 'ledger.entry.created',
  PAYOUT_CREATED = 'payout.created',
  PAYOUT_PROCESSED = 'payout.processed',

  // Wallet events
  WALLET_CREATED = 'wallet.created',
  WALLET_TOPPED_UP = 'wallet.topped.up',
  WALLET_DEBITED = 'wallet.debited',

  // Rider events
  RIDER_ASSIGNED = 'rider.assigned',
  DELIVERY_STARTED = 'delivery.started',
  DELIVERY_COMPLETED = 'delivery.completed',

  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',

  // Complaint events
  COMPLAINT_CREATED = 'complaint.created',
  COMPLAINT_RESOLVED = 'complaint.resolved',
}

// Event data interfaces
export interface UserCreatedEventData {
  userId: string;
  email: string;
  phone: string;
  role: string;
}

export interface OrderCreatedEventData {
  orderId: string;
  userId: string;
  vendorId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: string;
}

export interface ProductStockChangedEventData {
  productId: string;
  vendorId: string;
  previousStock: number;
  newStock: number;
  changeReason: string;
}

export interface LedgerEntryCreatedEventData {
  entryId: string;
  vendorId: string;
  type: string;
  amount: number;
  referenceId: string;
  referenceType: string;
}

export interface WalletTransactionEventData {
  walletId: string;
  userId: string;
  transactionId: string;
  type: string;
  amount: number;
  balance: number;
}

// Concrete event classes
export class UserCreatedEvent extends BaseEvent {
  constructor(data: UserCreatedEventData, correlationId?: string) {
    super(EventTypes.USER_CREATED, 'user-module', data, correlationId);
  }
}

export class OrderCreatedEvent extends BaseEvent {
  constructor(data: OrderCreatedEventData, correlationId?: string) {
    super(EventTypes.ORDER_CREATED, 'order-module', data, correlationId);
  }
}

export class ProductStockChangedEvent extends BaseEvent {
  constructor(data: ProductStockChangedEventData, correlationId?: string) {
    super(
      EventTypes.PRODUCT_STOCK_CHANGED,
      'product-module',
      data,
      correlationId,
    );
  }
}

export class LedgerEntryCreatedEvent extends BaseEvent {
  constructor(data: LedgerEntryCreatedEventData, correlationId?: string) {
    super(
      EventTypes.LEDGER_ENTRY_CREATED,
      'ledger-module',
      data,
      correlationId,
    );
  }
}

export class WalletTransactionEvent extends BaseEvent {
  constructor(data: WalletTransactionEventData, correlationId?: string) {
    super(EventTypes.WALLET_TOPPED_UP, 'wallet-module', data, correlationId);
  }
}
