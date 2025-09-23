import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({
  collection: 'subscriptions',
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
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId; // Reference to user with customer role

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId; // Reference to user with vendor role

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VendorStore' })
  storeId?: Types.ObjectId;

  // Subscription configuration
  @Prop({ 
    required: true,
    enum: ['daily', 'weekly', 'bi_weekly', 'monthly', 'custom'],
  })
  frequency: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  // Delivery schedule
  @Prop([{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }])
  deliveryDays: string[]; // For weekly/custom frequency

  @Prop([{ type: Number, min: 1, max: 31 }])
  deliveryDates: number[]; // For monthly frequency (dates of month)

  @Prop({ maxlength: 5 })
  preferredDeliveryTime?: string; // HH:MM format

  // Subscription period
  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: true })
  autoRenew: boolean;

  @Prop({ min: 1 })
  renewalPeriodMonths?: number; // Auto-renewal period

  // Status and lifecycle
  @Prop({ 
    required: true,
    enum: ['active', 'paused', 'cancelled', 'expired', 'suspended'],
    default: 'active',
  })
  status: string;

  @Prop()
  pausedAt?: Date;

  @Prop()
  pausedUntil?: Date;

  @Prop({ maxlength: 500 })
  pauseReason?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop({ maxlength: 500 })
  cancellationReason?: string;

  // Delivery tracking
  @Prop({ required: true })
  nextDeliveryDate: Date;

  @Prop()
  lastDeliveryDate?: Date;

  @Prop({ default: 0, min: 0 })
  totalDeliveries: number;

  @Prop({ default: 0, min: 0 })
  successfulDeliveries: number;

  @Prop({ default: 0, min: 0 })
  missedDeliveries: number;

  // Delivery history
  @Prop([
    {
      orderId: { type: Types.ObjectId, ref: 'Order' },
      scheduledDate: { type: Date, required: true },
      deliveredDate: { type: Date },
      status: { 
        type: String, 
        enum: ['scheduled', 'delivered', 'missed', 'cancelled', 'rescheduled'],
        required: true 
      },
      quantity: { type: Number, required: true },
      notes: { type: String, maxlength: 500 },
    },
  ])
  deliveryHistory: Array<{
    orderId?: Types.ObjectId;
    scheduledDate: Date;
    deliveredDate?: Date;
    status: string;
    quantity: number;
    notes?: string;
  }>;

  // Pricing and payment
  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number; // Per delivery

  @Prop({ 
    required: true,
    enum: ['wallet', 'upi', 'card', 'auto_debit'],
    default: 'wallet',
  })
  paymentMethod: string;

  @Prop({ default: false })
  autoPayment: boolean;

  // Delivery address
  @Prop({ type: Types.ObjectId, ref: 'Address' })
  deliveryAddressId?: Types.ObjectId;

  @Prop({
    type: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      contactPhone: { type: String, required: true },
      landmark: { type: String },
    },
    required: false
  })
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
    landmark?: string;
  };

  // Customer preferences
  @Prop({ maxlength: 1000 })
  specialInstructions?: string;

  @Prop({ default: true })
  allowRescheduling: boolean;

  @Prop({ default: 1, min: 0, max: 7 })
  maxRescheduleAttempts: number;

  @Prop({ default: 0, min: 0 })
  currentRescheduleAttempts: number;

  // Notifications
  @Prop({ default: true })
  notifyBeforeDelivery: boolean;

  @Prop({ default: 24, min: 1, max: 168 }) // hours
  notificationHours: number;

  @Prop({ default: true })
  smsNotifications: boolean;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  pushNotifications: boolean;

  // Performance metrics
  @Prop({ default: 0, min: 0, max: 100 })
  deliverySuccessRate: number;

  @Prop({ min: 1, max: 5 })
  averageRating?: number;

  @Prop({ default: 0, min: 0 })
  totalFeedbacks: number;

  // Financial tracking
  @Prop({ default: 0, min: 0 })
  totalRevenue: number;

  @Prop({ default: 0, min: 0 })
  totalRefunds: number;

  @Prop({ default: 0, min: 0 })
  outstandingAmount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Create indexes for performance optimization
SubscriptionSchema.index({ customerId: 1 });
SubscriptionSchema.index({ vendorId: 1 });
SubscriptionSchema.index({ productId: 1 });
SubscriptionSchema.index({ storeId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ frequency: 1 });
SubscriptionSchema.index({ nextDeliveryDate: 1 });
SubscriptionSchema.index({ startDate: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ createdAt: -1 });

// Compound indexes for common queries
SubscriptionSchema.index({ customerId: 1, status: 1 });
SubscriptionSchema.index({ vendorId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, nextDeliveryDate: 1 });
SubscriptionSchema.index({ customerId: 1, createdAt: -1 });
SubscriptionSchema.index({ vendorId: 1, createdAt: -1 });

// Pre-save middleware to calculate next delivery date and metrics
SubscriptionSchema.pre('save', function(next) {
  // Calculate delivery success rate
  if (this.totalDeliveries > 0) {
    this.deliverySuccessRate = Math.round((this.successfulDeliveries / this.totalDeliveries) * 100);
  }
  
  // Calculate total amount per delivery
  this.totalAmount = this.unitPrice * this.quantity;
  
  next();
});

// Method to calculate next delivery date based on frequency
SubscriptionSchema.methods.calculateNextDeliveryDate = function(fromDate?: Date): Date {
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
    case 'custom':
      // For custom frequency, find next delivery day
      if (this.deliveryDays.length > 0) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = nextDate.getDay();
        const deliveryDayNumbers = this.deliveryDays.map(day => dayNames.indexOf(day));
        
        let daysToAdd = 1;
        while (daysToAdd <= 7) {
          const checkDay = (currentDay + daysToAdd) % 7;
          if (deliveryDayNumbers.includes(checkDay)) {
            nextDate.setDate(nextDate.getDate() + daysToAdd);
            break;
          }
          daysToAdd++;
        }
      }
      break;
  }
  
  return nextDate;
};

// Method to check if subscription is active
SubscriptionSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && 
         (!this.endDate || new Date() <= this.endDate);
};

// Method to check if subscription can be paused
SubscriptionSchema.methods.canBePaused = function(): boolean {
  return this.status === 'active';
};

// Method to check if subscription can be resumed
SubscriptionSchema.methods.canBeResumed = function(): boolean {
  return this.status === 'paused' && 
         (!this.pausedUntil || new Date() >= this.pausedUntil);
};

// Method to check if delivery is due
SubscriptionSchema.methods.isDeliveryDue = function(): boolean {
  return this.isActive() && new Date() >= this.nextDeliveryDate;
};

// Method to add delivery to history
SubscriptionSchema.methods.addDeliveryRecord = function(orderId: Types.ObjectId, status: string, deliveredDate?: Date, notes?: string): void {
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
