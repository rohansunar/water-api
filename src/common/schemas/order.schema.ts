import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus, OrderSchedule } from '../interfaces/order.interface';

export type OrderDocument = Order & Document;

@Schema({
  collection: 'orders',
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
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, enum: Object.values(OrderStatus), default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ required: true, enum: Object.values(OrderSchedule) })
  schedule: OrderSchedule;

  @Prop()
  scheduledDate?: Date;

  @Prop({ required: true, enum: Object.values(PaymentMethod) })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    contactPhone: { type: String, required: true },
  })
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedAgentId?: Types.ObjectId;

  @Prop()
  estimatedDeliveryTime?: Date;

  @Prop()
  actualDeliveryTime?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop()
  notes?: string;

  @Prop([{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  }])
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
  }>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
