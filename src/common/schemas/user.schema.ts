import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../interfaces/user.interface';

export type UserDocument = User & Document;

@Schema({
  collection: 'users',
  timestamps: true,
  toJSON: {
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.otpCode;
      delete ret.otpExpiry;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Object.values(UserRole), default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop([{
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    contactPhone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  }])
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
    isDefault: boolean;
  }>;

  // OTP fields for authentication
  @Prop()
  otpCode?: string;

  @Prop()
  otpExpiry?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
