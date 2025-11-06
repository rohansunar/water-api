export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  vendorId: string;
  frequency: SubscriptionFrequency;
  quantity: number;
  deliveryDays: string[]; // ['monday', 'wednesday'] for custom frequency
  startDate: Date;
  endDate?: Date;
  status: SubscriptionStatus;
  deliveryAddress: SubscriptionAddress;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  nextDeliveryDate: Date;
  deliveryHistory: SubscriptionDelivery[];
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
}

export interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  orderId: string;
  scheduledDate: Date;
  deliveredDate?: Date;
  status: DeliveryStatus;
  notes?: string;
}

export enum SubscriptionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum DeliveryStatus {
  SCHEDULED = 'scheduled',
  DELIVERED = 'delivered',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  WALLET = 'wallet',
  UPI = 'upi',
  CARD = 'card',
  AUTO_DEBIT = 'auto_debit',
}
