import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  DELIVERY_RIDER = 'rider',
  ADMIN = 'admin',
}

export interface Address {
  _id?: Types.ObjectId;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  isDefault?: boolean;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false, unique: true, sparse: true, index: true })
  email?: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.CUSTOMER,
    index: true,
  })
  role: UserRole;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop({ type: [Object], default: [] })
  addresses: Address[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for performance
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Address schema for separate address collection
@Schema({ timestamps: true })
export class UserAddress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  line1: string;

  @Prop()
  line2?: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  pincode: string;

  @Prop()
  landmark?: string;

  @Prop()
  label?: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);
export type UserAddressDocument = UserAddress & Document;

// Indexes for address collection
UserAddressSchema.index({ isActive: 1 });
UserAddressSchema.index({ isDefault: 1 });
UserAddressSchema.index({ location: '2dsphere' });

// Pre-save middleware for address
UserAddressSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
