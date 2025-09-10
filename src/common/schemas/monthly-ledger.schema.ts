import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MonthlyLedgerDocument = MonthlyLedger & Document;

@Schema({ timestamps: true })
export class MonthlyLedger {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  rate: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  deliveryDate: Date;

  @Prop({ required: true, enum: ['unpaid', 'paid'], default: 'unpaid' })
  status: string;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MonthlyLedgerSchema = SchemaFactory.createForClass(MonthlyLedger);

// Create compound indexes for efficient queries
MonthlyLedgerSchema.index({ userId: 1, month: 1, year: 1 });
MonthlyLedgerSchema.index({ vendorId: 1, month: 1, year: 1 });
MonthlyLedgerSchema.index({ status: 1, month: 1, year: 1 });
