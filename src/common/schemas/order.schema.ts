import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  orderUuid: string;

  @Prop({ required: true })
  customerId: string;

  @Prop()
  vendorId?: string;

  @Prop()
  storeId?: string;

  @Prop()
  riderId?: string;

  @Prop({ required: true })
  addressId: string;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({
    default: 'placed',
    enum: [
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'delivered',
      'cancelled',
    ],
  })
  status: string;

  @Prop({ required: true, type: Number })
  subtotal: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0, type: Number })
  taxAmount: number;

  @Prop({ required: true, type: Number })
  totalAmount: number;

  @Prop({ default: 'cash', enum: ['cash', 'online', 'wallet'] })
  paymentMethod: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'refunded'],
  })
  paymentStatus: string;

  @Prop()
  deliveryInstructions?: string;

  @Prop()
  scheduledDelivery?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  subscriptionId?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
