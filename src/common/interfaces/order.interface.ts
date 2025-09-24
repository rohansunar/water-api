export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  depositAmount: number;
  deliveryFee: number;
  status: OrderStatus;
  schedule: OrderSchedule;
  deliveryTime?: Date;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: OrderAddress;
  deliveryRiderId?: string;
  specialInstructions?: string;
  trackingInfo?: TrackingInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
}

export interface TrackingInfo {
  orderId: string;
  currentStatus: OrderStatus;
  statusHistory: StatusHistory[];
  estimatedDeliveryTime?: Date;
  deliveryRiderLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

export interface StatusHistory {
  status: OrderStatus;
  timestamp: Date;
  notes?: string;
  updatedBy: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum OrderSchedule {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
}

export enum PaymentMethod {
  WALLET = 'wallet',
  UPI = 'upi',
  COD = 'cod',
  CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
