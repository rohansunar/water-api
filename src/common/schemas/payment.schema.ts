import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  method: string; // 'cash' | 'card' | 'upi' | 'wallet'

  @Prop({ required: true })
  status: string; // 'pending' | 'completed' | 'failed' | 'refunded'

  @Prop()
  transactionId?: string;

  @Prop()
  paymentGateway?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
