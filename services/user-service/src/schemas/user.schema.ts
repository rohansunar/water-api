import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../interfaces/user.interface';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop({
    type: [
      {
        street: String,
        city: String,
        state: String,
        pincode: String,
        landmark: String,
        latitude: Number,
        longitude: Number,
        isDefault: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }>;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes for better performance
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
