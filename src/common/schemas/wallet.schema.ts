import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({
  collection: 'wallets',
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
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  balance: number;

  @Prop({ default: 'INR', maxlength: 3 })
  currency: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ maxlength: 500 })
  blockReason?: string;

  @Prop()
  blockedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  blockedBy?: Types.ObjectId;

  // Wallet limits
  @Prop({ default: 50000, min: 0 })
  maxBalance: number;

  @Prop({ default: 10000, min: 0 })
  dailyTransactionLimit: number;

  @Prop({ default: 25000, min: 0 })
  monthlyTransactionLimit: number;

  // Usage tracking
  @Prop({ default: 0, min: 0 })
  totalCredits: number;

  @Prop({ default: 0, min: 0 })
  totalDebits: number;

  @Prop({ default: 0, min: 0 })
  totalTransactions: number;

  @Prop()
  lastTransactionAt?: Date;

  // Daily and monthly usage tracking
  @Prop({ default: 0, min: 0 })
  dailySpent: number;

  @Prop({ default: 0, min: 0 })
  monthlySpent: number;

  @Prop()
  lastDailyReset?: Date;

  @Prop()
  lastMonthlyReset?: Date;

  // Security and verification
  @Prop({ default: false })
  isKycVerified: boolean;

  @Prop({ maxlength: 50 })
  kycStatus?: string;

  @Prop()
  kycVerifiedAt?: Date;

  @Prop({ default: 0, min: 0 })
  securityScore: number; // 0-100

  // Cashback and rewards
  @Prop({ default: 0, min: 0 })
  totalCashback: number;

  @Prop({ default: 0, min: 0 })
  availableCashback: number;

  @Prop({ default: 0, min: 0 })
  loyaltyPoints: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Wallet Transaction Schema
@Schema({
  collection: 'wallet_transactions',
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
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true })
  walletId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['credit', 'debit'],
  })
  type: string;

  @Prop({ required: true })
  amount: number; // Always positive, type determines credit/debit

  @Prop({ required: true, min: 0 })
  balanceAfter: number;

  @Prop({ required: true, maxlength: 500 })
  description: string;

  // Reference information
  @Prop({ maxlength: 255 })
  referenceId?: string; // Order ID, Topup ID, etc.

  @Prop({
    enum: [
      'order',
      'topup',
      'refund',
      'cashback',
      'penalty',
      'bonus',
      'transfer',
      'adjustment',
    ],
  })
  referenceType?: string;

  @Prop({
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'completed',
  })
  status: string;

  // Payment gateway information (for topups)
  @Prop({ maxlength: 255 })
  gatewayTransactionId?: string;

  @Prop({ maxlength: 64 })
  paymentMethod?: string; // upi, card, net_banking, etc.

  @Prop({ maxlength: 64 })
  paymentProvider?: string; // razorpay, stripe, etc.

  // Fees and charges
  @Prop({ default: 0, min: 0 })
  processingFee: number;

  @Prop({ default: 0, min: 0 })
  taxes: number;

  @Prop({ min: 0 })
  netAmount?: number; // Amount after fees and taxes

  // Reversal information
  @Prop({ type: Types.ObjectId, ref: 'WalletTransaction' })
  reversalTransactionId?: Types.ObjectId;

  @Prop()
  reversedAt?: Date;

  @Prop({ maxlength: 500 })
  reversalReason?: string;

  // Approval workflow (for large amounts)
  @Prop({ default: false })
  requiresApproval: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ maxlength: 500 })
  approvalNotes?: string;

  // Fraud detection
  @Prop({
    enum: ['low', 'medium', 'high'],
    default: 'low',
  })
  riskScore: string;

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop({ maxlength: 500 })
  flagReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

// Create indexes for Wallet
WalletSchema.index({ userId: 1 }, { unique: true });
WalletSchema.index({ isActive: 1 });
WalletSchema.index({ isBlocked: 1 });
WalletSchema.index({ balance: 1 });
WalletSchema.index({ createdAt: -1 });

// Create indexes for WalletTransaction
WalletTransactionSchema.index({ walletId: 1 });
WalletTransactionSchema.index({ userId: 1 });
WalletTransactionSchema.index({ type: 1 });
WalletTransactionSchema.index({ status: 1 });
WalletTransactionSchema.index({ referenceId: 1 });
WalletTransactionSchema.index({ referenceType: 1 });
WalletTransactionSchema.index({ gatewayTransactionId: 1 });
WalletTransactionSchema.index({ createdAt: -1 });

// Compound indexes
WalletTransactionSchema.index({ userId: 1, type: 1 });
WalletTransactionSchema.index({ userId: 1, status: 1 });
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });

// Pre-save middleware for Wallet to reset daily/monthly limits
WalletSchema.pre('save', function (next) {
  const now = new Date();

  // Reset daily spent if it's a new day
  if (
    !this.lastDailyReset ||
    this.lastDailyReset.toDateString() !== now.toDateString()
  ) {
    this.dailySpent = 0;
    this.lastDailyReset = now;
  }

  // Reset monthly spent if it's a new month
  if (
    !this.lastMonthlyReset ||
    this.lastMonthlyReset.getMonth() !== now.getMonth() ||
    this.lastMonthlyReset.getFullYear() !== now.getFullYear()
  ) {
    this.monthlySpent = 0;
    this.lastMonthlyReset = now;
  }

  next();
});

// Pre-save middleware for WalletTransaction to calculate net amount
WalletTransactionSchema.pre('save', function (next) {
  if (this.type === 'credit') {
    this.netAmount = this.amount - this.processingFee - this.taxes;
  } else {
    this.netAmount = this.amount;
  }

  next();
});

// Wallet methods
WalletSchema.methods.canDebit = function (amount: number): boolean {
  return (
    this.isActive &&
    !this.isBlocked &&
    this.balance >= amount &&
    this.dailySpent + amount <= this.dailyTransactionLimit &&
    this.monthlySpent + amount <= this.monthlyTransactionLimit
  );
};

WalletSchema.methods.canCredit = function (amount: number): boolean {
  return (
    this.isActive && !this.isBlocked && this.balance + amount <= this.maxBalance
  );
};

WalletSchema.methods.updateBalance = function (
  amount: number,
  type: 'credit' | 'debit',
): number {
  if (type === 'credit') {
    this.balance += amount;
    this.totalCredits += amount;
  } else {
    this.balance -= amount;
    this.totalDebits += amount;
    this.dailySpent += amount;
    this.monthlySpent += amount;
  }

  this.totalTransactions++;
  this.lastTransactionAt = new Date();

  return this.balance;
};

// WalletTransaction methods
WalletTransactionSchema.methods.isCredit = function (): boolean {
  return this.type === 'credit';
};

WalletTransactionSchema.methods.isDebit = function (): boolean {
  return this.type === 'debit';
};

WalletTransactionSchema.methods.canBeReversed = function (): boolean {
  const reversalWindow = 24 * 60 * 60 * 1000; // 24 hours
  const timeSinceTransaction = Date.now() - this.createdAt.getTime();

  return (
    this.status === 'completed' &&
    !this.reversalTransactionId &&
    timeSinceTransaction <= reversalWindow
  );
};
