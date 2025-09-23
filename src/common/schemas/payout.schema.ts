import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PayoutStatus, PayoutMethod } from '../interfaces/ledger.interface';

export type PayoutDocument = Payout & Document;

@Schema({
  collection: 'payouts',
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
export class Payout {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    required: true,
    enum: Object.values(PayoutStatus),
    default: PayoutStatus.PENDING,
    index: true
  })
  status: PayoutStatus;

  // Payout method and details
  @Prop({
    required: true,
    enum: Object.values(PayoutMethod),
    default: PayoutMethod.BANK_TRANSFER,
  })
  method: PayoutMethod;

  @Prop({
    type: {
      bankAccountNumber: { type: String, maxlength: 20 },
      ifscCode: { type: String, maxlength: 11 },
      bankName: { type: String, maxlength: 100 },
      accountHolderName: { type: String, maxlength: 100 },
      upiId: { type: String, maxlength: 100 },
      walletId: { type: String, maxlength: 100 },
      chequeNumber: { type: String, maxlength: 20 },
    },
    required: false
  })
  payoutDetails?: {
    bankAccountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
    upiId?: string;
    walletId?: string;
    chequeNumber?: string;
  };

  // Financial breakdown
  @Prop({ default: 0, min: 0 })
  processingFee: number;

  @Prop({ default: 0, min: 0 })
  taxDeducted: number; // TDS or other tax deductions

  @Prop({ required: true, min: 0 })
  netAmount: number; // Amount after fees and taxes

  // Period information
  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ required: true, min: 2020 })
  year: number;

  @Prop()
  periodStart?: Date;

  @Prop()
  periodEnd?: Date;

  // Ledger entries included in this payout
  @Prop([{ type: Types.ObjectId, ref: 'LedgerEntry' }])
  ledgerEntries: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  totalSales: number;

  @Prop({ default: 0, min: 0 })
  totalCommission: number;

  @Prop({ default: 0, min: 0 })
  totalRefunds: number;

  @Prop({ default: 0, min: 0 })
  totalAdjustments: number;

  // Timing information
  @Prop()
  requestedAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop()
  initiatedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  // External references
  @Prop({ maxlength: 255 })
  externalReference?: string; // Bank reference number

  @Prop({ maxlength: 100 })
  transactionId?: string; // Payment gateway transaction ID

  @Prop({ maxlength: 100 })
  batchId?: string; // Batch processing ID

  // Approval workflow
  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  @Prop({ maxlength: 500 })
  approvalNotes?: string;

  @Prop({ maxlength: 500 })
  rejectionReason?: string;

  // Failure handling
  @Prop({ maxlength: 500 })
  failureReason?: string;

  @Prop({ default: 0, min: 0 })
  retryCount: number;

  @Prop()
  nextRetryAt?: Date;

  @Prop({ default: 3, min: 0 })
  maxRetries: number;

  // Notifications
  @Prop({ default: false })
  vendorNotified: boolean;

  @Prop()
  notifiedAt?: Date;

  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ default: false })
  smsSent: boolean;

  // Reconciliation
  @Prop({ default: false })
  isReconciled: boolean;

  @Prop()
  reconciledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reconciledBy?: Types.ObjectId;

  @Prop({ maxlength: 500 })
  reconciliationNotes?: string;

  // Tax and compliance
  @Prop({ maxlength: 50 })
  taxCertificateNumber?: string;

  @Prop()
  taxCertificateDate?: Date;

  @Prop({ maxlength: 500 })
  taxCertificateUrl?: string;

  // Priority and scheduling
  @Prop({ 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  })
  priority: string;

  @Prop()
  scheduledAt?: Date;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

// Create indexes for performance optimization
PayoutSchema.index({ vendorId: 1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ method: 1 });
PayoutSchema.index({ month: 1, year: 1 });
PayoutSchema.index({ batchId: 1 });
PayoutSchema.index({ transactionId: 1 });
PayoutSchema.index({ externalReference: 1 });
PayoutSchema.index({ priority: 1 });
PayoutSchema.index({ scheduledAt: 1 });
PayoutSchema.index({ createdAt: -1 });

// Compound indexes for common queries
PayoutSchema.index({ vendorId: 1, status: 1 });
PayoutSchema.index({ vendorId: 1, month: 1, year: 1 });
PayoutSchema.index({ vendorId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, priority: -1 });
PayoutSchema.index({ status: 1, scheduledAt: 1 });
PayoutSchema.index({ batchId: 1, status: 1 });

// Pre-save middleware to calculate net amount and update timing
PayoutSchema.pre('save', function(next) {
  // Calculate net amount
  this.netAmount = this.amount - this.processingFee - this.taxDeducted;
  
  // Update timing based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case PayoutStatus.PENDING:
        this.requestedAt = now;
        break;
      case PayoutStatus.PROCESSING:
        this.approvedAt = now;
        break;
      case PayoutStatus.COMPLETED:
        this.completedAt = now;
        break;
      case PayoutStatus.FAILED:
        this.failedAt = now;
        break;
    }
  }
  
  next();
});

// Method to check if payout can be cancelled
PayoutSchema.methods.canBeCancelled = function(): boolean {
  const cancellableStatuses = ['requested', 'pending_approval', 'approved'];
  return cancellableStatuses.includes(this.status);
};

// Method to check if payout can be retried
PayoutSchema.methods.canBeRetried = function(): boolean {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

// Method to calculate processing time
PayoutSchema.methods.getProcessingTime = function(): number | null {
  if (this.requestedAt && this.completedAt) {
    return Math.round((this.completedAt.getTime() - this.requestedAt.getTime()) / (1000 * 60 * 60)); // hours
  }
  return null;
};

// Method to check if payout is overdue
PayoutSchema.methods.isOverdue = function(): boolean {
  if (!this.scheduledAt || this.status === 'completed') {
    return false;
  }
  return new Date() > this.scheduledAt;
};

// Method to get effective amount (what vendor receives)
PayoutSchema.methods.getEffectiveAmount = function(): number {
  return this.netAmount;
};

// Static method to calculate total pending amount for vendor
PayoutSchema.statics.getTotalPendingAmount = async function(vendorId: Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        vendorId,
        status: { $in: ['requested', 'pending_approval', 'approved', 'processing'] }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalAmount : 0;
};
