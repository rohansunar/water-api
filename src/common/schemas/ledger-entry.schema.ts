import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LedgerEntryType, LedgerEntryStatus } from '../interfaces/ledger.interface';

export type LedgerEntryDocument = LedgerEntry & Document;

@Schema({
  collection: 'ledger_entries',
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
export class LedgerEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(LedgerEntryType),
    index: true
  })
  type: LedgerEntryType;

  @Prop({ required: true })
  amount: number; // Can be positive or negative

  @Prop({ required: true, min: 0 })
  balanceAfter: number;

  @Prop({ required: true, maxlength: 500 })
  description: string;

  // Transaction categorization
  @Prop({ 
    enum: ['revenue', 'expense', 'liability', 'asset'], 
    required: true 
  })
  category: string;

  @Prop({ 
    enum: ['debit', 'credit'], 
    required: true 
  })
  entryType: string;

  // Reference information
  @Prop({ maxlength: 255 })
  referenceId?: string; // External reference (invoice number, etc.)

  @Prop({ 
    enum: ['order', 'payment', 'refund', 'commission', 'fee', 'manual', 'system'], 
    default: 'system' 
  })
  referenceType: string;

  // Financial period tracking
  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ required: true, min: 2020 })
  year: number;

  @Prop({ required: true, min: 1, max: 4 })
  quarter: number;

  @Prop({ required: true })
  financialYear: string; // e.g., "2024-25"

  // Tax information
  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0, max: 100 })
  taxRate: number;

  @Prop({ maxlength: 50 })
  taxType?: string; // GST, VAT, etc.

  // Commission and fee breakdown
  @Prop({ default: 0 })
  platformCommission: number;

  @Prop({ default: 0 })
  paymentGatewayFee: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  otherFees: number;

  // Settlement information
  @Prop({ 
    enum: ['pending', 'processing', 'settled', 'failed', 'disputed'], 
    default: 'pending' 
  })
  settlementStatus: string;

  @Prop()
  settlementDate?: Date;

  @Prop({ maxlength: 100 })
  settlementId?: string;

  // Reconciliation
  @Prop({ default: false })
  isReconciled: boolean;

  @Prop()
  reconciledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reconciledBy?: Types.ObjectId;

  @Prop({ maxlength: 500 })
  reconciliationNotes?: string;

  // Audit trail
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({
    enum: Object.values(LedgerEntryStatus),
    default: LedgerEntryStatus.PENDING,
    index: true
  })
  status: LedgerEntryStatus;

  @Prop({ maxlength: 500 })
  notes?: string;

  // Dispute information
  @Prop({ default: false })
  isDisputed: boolean;

  @Prop({ maxlength: 1000 })
  disputeReason?: string;

  @Prop()
  disputedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  disputedBy?: Types.ObjectId;

  @Prop()
  disputeResolvedAt?: Date;

  @Prop({ maxlength: 1000 })
  disputeResolution?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);

// Create indexes for performance optimization
LedgerEntrySchema.index({ vendorId: 1 });
LedgerEntrySchema.index({ orderId: 1 });
LedgerEntrySchema.index({ paymentId: 1 });
LedgerEntrySchema.index({ type: 1 });
LedgerEntrySchema.index({ category: 1 });
LedgerEntrySchema.index({ entryType: 1 });
LedgerEntrySchema.index({ month: 1, year: 1 });
LedgerEntrySchema.index({ quarter: 1, year: 1 });
LedgerEntrySchema.index({ financialYear: 1 });
LedgerEntrySchema.index({ settlementStatus: 1 });
LedgerEntrySchema.index({ status: 1 });
LedgerEntrySchema.index({ createdAt: -1 });

// Compound indexes for common queries
LedgerEntrySchema.index({ vendorId: 1, month: 1, year: 1 });
LedgerEntrySchema.index({ vendorId: 1, type: 1 });
LedgerEntrySchema.index({ vendorId: 1, settlementStatus: 1 });
LedgerEntrySchema.index({ vendorId: 1, createdAt: -1 });
LedgerEntrySchema.index({ type: 1, settlementStatus: 1 });
LedgerEntrySchema.index({ month: 1, year: 1, type: 1 });

// Pre-save middleware to calculate financial period information
LedgerEntrySchema.pre('save', function(next) {
  if (this.isNew) {
    const date = this.createdAt || new Date();
    
    // Set month and year
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
    
    // Calculate quarter
    this.quarter = Math.ceil(this.month / 3);
    
    // Calculate financial year (April to March)
    const financialYearStart = this.month >= 4 ? this.year : this.year - 1;
    this.financialYear = `${financialYearStart}-${(financialYearStart + 1).toString().slice(-2)}`;
  }
  
  next();
});

// Method to check if entry is a credit
LedgerEntrySchema.methods.isCredit = function(): boolean {
  return this.entryType === 'credit' || this.amount > 0;
};

// Method to check if entry is a debit
LedgerEntrySchema.methods.isDebit = function(): boolean {
  return this.entryType === 'debit' || this.amount < 0;
};

// Method to get absolute amount
LedgerEntrySchema.methods.getAbsoluteAmount = function(): number {
  return Math.abs(this.amount);
};

// Method to get net amount (after all fees and taxes)
LedgerEntrySchema.methods.getNetAmount = function(): number {
  const fees = this.platformCommission + this.paymentGatewayFee + this.deliveryFee + this.otherFees;
  return this.amount - fees - this.taxAmount;
};

// Method to check if entry can be disputed
LedgerEntrySchema.methods.canBeDisputed = function(): boolean {
  const disputeWindow = 30; // 30 days
  const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  return !this.isDisputed && 
         this.status === 'approved' && 
         daysSinceCreation <= disputeWindow;
};

// Method to check if entry is settled
LedgerEntrySchema.methods.isSettled = function(): boolean {
  return this.settlementStatus === 'settled';
};

// Static method to calculate balance after entry
LedgerEntrySchema.statics.calculateBalance = async function(vendorId: Types.ObjectId, amount: number): Promise<number> {
  const lastEntry = await this.findOne(
    { vendorId },
    {},
    { sort: { createdAt: -1 } }
  );
  
  const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
  return currentBalance + amount;
};
