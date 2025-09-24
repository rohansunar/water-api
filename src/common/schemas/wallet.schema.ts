import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletDocument = Wallet & Document;
export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userType: string; // 'customer' | 'vendor' | 'rider'

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  totalEarned: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop({ default: 0 })
  totalWithdrawn: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastTransactionAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true })
  walletId: string;

  @Prop({ required: true })
  type: string; // 'credit' | 'debit'

  @Prop({ required: true })
  amount: number;

  @Prop()
  description?: string;

  @Prop()
  referenceId?: string;

  @Prop()
  balanceAfter: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);
