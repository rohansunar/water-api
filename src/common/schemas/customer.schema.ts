import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  phone: string;

  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop([{ type: Types.ObjectId, ref: 'Address' }])
  addresses: Types.ObjectId[];

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({
    required: true,
    enum: ['customer', 'vendor', 'delivery_rider', 'admin'],
  })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
