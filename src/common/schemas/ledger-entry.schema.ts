import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LedgerEntryDocument = LedgerEntry & Document;

@Schema({ timestamps: true })
export class LedgerEntry {
  @Prop({ required: true })
  vendorId: string;

  @Prop()
  userId?: string;

  @Prop()
  orderId?: string;

  @Prop({ required: true })
  type: string; // 'credit' | 'debit'

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop()
  status?: string;

  @Prop()
  description?: string;

  @Prop()
  referenceId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);
