import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  frequency: string; // 'daily' | 'weekly' | 'monthly'

  @Prop({ required: true })
  status: string; // 'active' | 'paused' | 'cancelled'

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  nextDeliveryDate?: Date;

  @Prop()
  pausedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop({ type: Object })
  deliveryAddress?: Record<string, any>;

  @Prop({ type: Object })
  productSnapshot?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
