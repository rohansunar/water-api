import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({
  collection: 'payments',
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
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ unique: true, maxlength: 255 })
  transactionId?: string; // External payment gateway transaction ID

  @Prop({ maxlength: 64 })
  provider?: string; // razorpay, stripe, paytm, etc.

  @Prop({ 
    required: true,
    enum: ['wallet', 'upi', 'card', 'net_banking', 'cash_on_delivery', 'bank_transfer'],
  })
  method: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 0, min: 0 })
  fees: number; // Payment gateway fees

  @Prop({ default: 0, min: 0 })
  taxes: number; // Taxes on payment

  @Prop({ 
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending',
  })
  status: string;

  // Payment gateway response
  @Prop({ type: Object })
  gatewayResponse?: Record<string, any>;

  @Prop({ maxlength: 500 })
  gatewayMessage?: string;

  @Prop({ maxlength: 100 })
  gatewayTransactionId?: string;

  // Refund information
  @Prop({ default: 0, min: 0 })
  refundedAmount: number;

  @Prop()
  refundedAt?: Date;

  @Prop({ maxlength: 500 })
  refundReason?: string;

  @Prop({ maxlength: 100 })
  refundTransactionId?: string;

  // Payment attempts and retries
  @Prop({ default: 1, min: 1 })
  attemptNumber: number;

  @Prop([
    {
      attemptNumber: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
      status: { type: String, required: true },
      gatewayResponse: { type: Object },
      errorMessage: { type: String, maxlength: 500 },
    },
  ])
  paymentAttempts: Array<{
    attemptNumber: number;
    timestamp: Date;
    status: string;
    gatewayResponse?: Record<string, any>;
    errorMessage?: string;
  }>;

  // Timing information
  @Prop()
  initiatedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  expiresAt?: Date;

  // Customer payment details (masked/tokenized)
  @Prop({
    type: {
      cardLast4: { type: String, maxlength: 4 },
      cardType: { type: String, maxlength: 20 },
      bankName: { type: String, maxlength: 100 },
      upiId: { type: String, maxlength: 100 },
      walletProvider: { type: String, maxlength: 50 },
    },
    required: false
  })
  paymentDetails?: {
    cardLast4?: string;
    cardType?: string;
    bankName?: string;
    upiId?: string;
    walletProvider?: string;
  };

  // Risk and fraud detection
  @Prop({ 
    enum: ['low', 'medium', 'high'], 
    default: 'low' 
  })
  riskScore: string;

  @Prop({ default: false })
  isFraudulent: boolean;

  @Prop({ maxlength: 500 })
  fraudReason?: string;

  // Reconciliation
  @Prop({ default: false })
  isReconciled: boolean;

  @Prop()
  reconciledAt?: Date;

  @Prop({ maxlength: 100 })
  reconciliationId?: string;

  // Notifications
  @Prop({ default: false })
  customerNotified: boolean;

  @Prop({ default: false })
  vendorNotified: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes for performance optimization
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ gatewayTransactionId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ method: 1 });
PaymentSchema.index({ provider: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ completedAt: -1 });

// Compound indexes for common queries
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ provider: 1, status: 1 });
PaymentSchema.index({ method: 1, status: 1 });

// Pre-save middleware to update timing and attempt tracking
PaymentSchema.pre('save', function(next) {
  const now = new Date();
  
  // Update timing based on status changes
  if (this.isModified('status')) {
    switch (this.status) {
      case 'processing':
        if (!this.initiatedAt) {
          this.initiatedAt = now;
        }
        break;
      case 'completed':
        this.completedAt = now;
        break;
      case 'failed':
        this.failedAt = now;
        break;
      case 'refunded':
      case 'partially_refunded':
        if (!this.refundedAt) {
          this.refundedAt = now;
        }
        break;
    }
    
    // Add to payment attempts
    this.paymentAttempts.push({
      attemptNumber: this.attemptNumber,
      timestamp: now,
      status: this.status,
      gatewayResponse: this.gatewayResponse,
      errorMessage: this.gatewayMessage,
    });
  }
  
  next();
});

// Method to check if payment is successful
PaymentSchema.methods.isSuccessful = function(): boolean {
  return this.status === 'completed';
};

// Method to check if payment can be refunded
PaymentSchema.methods.canBeRefunded = function(): boolean {
  return this.status === 'completed' && this.refundedAmount < this.amount;
};

// Method to get refundable amount
PaymentSchema.methods.getRefundableAmount = function(): number {
  if (!this.canBeRefunded()) {
    return 0;
  }
  return this.amount - this.refundedAmount;
};

// Method to calculate net amount (after fees and taxes)
PaymentSchema.methods.getNetAmount = function(): number {
  return this.amount - this.fees - this.taxes;
};

// Method to check if payment is expired
PaymentSchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? new Date() > this.expiresAt : false;
};
