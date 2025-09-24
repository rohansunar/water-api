import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderItemDocument = OrderItem & Document;

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop()
  totalPrice?: number;

  @Prop({ type: Object })
  productSnapshot?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
