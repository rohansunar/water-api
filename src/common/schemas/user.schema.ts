import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    default: 'customer',
    enum: ['customer', 'vendor', 'delivery_rider', 'admin'],
  })
  role: string;

  @Prop({ type: [{ type: String, ref: 'Address' }] })
  addresses: string[];

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  lastActiveAt?: Date;

  @Prop()
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
