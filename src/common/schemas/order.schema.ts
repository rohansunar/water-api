import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  OrderSchedule,
} from '../interfaces/order.interface';

export type OrderDocument = Order & Document;

@Schema({
  collection: 'orders',
  timestamps: true,
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Order {
  @Prop({ unique: true, default: () => require('uuid').v4() })
  orderUuid: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId; // Reference to user with customer role

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId; // Reference to user with vendor role

  @Prop({ type: Types.ObjectId, ref: 'VendorStore' })
  storeId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0 })
  deliveryFee: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({
    required: true,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'Address' })
  deliveryAddressId?: Types.ObjectId;

  // Delivery time slot
  @Prop()
  slotStart?: Date;

  @Prop()
  slotEnd?: Date;

  // Order type and source
  @Prop({
    enum: ['one_time', 'subscription'],
    default: 'one_time'
  })
  orderType: string;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId?: Types.ObjectId;

  @Prop({
    enum: ['web', 'mobile', 'phone', 'admin'],
    default: 'web'
  })
  orderSource: string;

  // Customer and order details
  @Prop({ maxlength: 1000 })
  specialInstructions?: string;

  @Prop({ maxlength: 500 })
  cancellationReason?: string;

  @Prop({ maxlength: 1000 })
  notes?: string;

  // Delivery tracking
  @Prop()
  estimatedDeliveryTime?: Date;

  @Prop()
  actualDeliveryTime?: Date;

  @Prop({ maxlength: 10 })
  deliveryOtp?: string;

  @Prop([{ type: String, maxlength: 500 }])
  proofPhotos: string[];

  // Status tracking with detailed history
  @Prop([
    {
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      notes: { type: String, maxlength: 500 },
      updatedBy: { type: Types.ObjectId, ref: 'User' },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
  ])
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
    updatedBy?: Types.ObjectId;
    location?: {
      latitude: number;
      longitude: number;
    };
  }>;

  // Financial tracking
  @Prop({ default: 0, min: 0 })
  refundAmount: number;

  @Prop()
  refundedAt?: Date;

  @Prop({ maxlength: 500 })
  refundReason?: string;

  // Rating and feedback
  @Prop({ min: 1, max: 5 })
  customerRating?: number;

  @Prop({ maxlength: 1000 })
  customerFeedback?: string;

  @Prop()
  feedbackAt?: Date;

  // System metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Create indexes for performance optimization
OrderSchema.index({ orderUuid: 1 }, { unique: true });
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ vendorId: 1 });
OrderSchema.index({ storeId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ subscriptionId: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ slotStart: 1 });
OrderSchema.index({ estimatedDeliveryTime: 1 });

// Compound indexes for common queries
OrderSchema.index({ customerId: 1, status: 1 });
OrderSchema.index({ vendorId: 1, status: 1 });
OrderSchema.index({ vendorId: 1, createdAt: -1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderType: 1, status: 1 });

// Pre-save middleware to update status history
OrderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      notes: `Status changed to ${this.status}`,
    });
  }
  next();
});

// Method to calculate final amount
OrderSchema.methods.calculateFinalAmount = function(): number {
  return this.totalAmount + this.taxAmount + this.deliveryFee - this.discountAmount;
};

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function(): boolean {
  const nonCancellableStatuses = [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];
  return !nonCancellableStatuses.includes(this.status);
};

// Method to check if order is in progress
OrderSchema.methods.isInProgress = function(): boolean {
  const inProgressStatuses = [
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.OUT_FOR_DELIVERY,
  ];
  return inProgressStatuses.includes(this.status);
};
