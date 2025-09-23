import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CustomerRole } from '../interfaces/customer.interface';

export type CustomerDocument = Customer & Document;

// Role-specific extension interfaces
export interface CustomerExtension {
  loyaltyPoints: number;
  preferences: {
    preferredDeliveryTime?: string;
    specialInstructions?: string;
    notificationPreferences?: {
      sms: boolean;
      email: boolean;
      push: boolean;
    };
  };
}

export interface VendorExtension {
  kycStatus: 'pending' | 'approved' | 'rejected';
  gstin?: string;
  bankAccountId?: Types.ObjectId;
  rating: number;
  totalOrders: number;
  businessMetrics: {
    totalRevenue: number;
    averageOrderValue: number;
    customerRetentionRate: number;
  };
}

export interface RiderExtension {
  licenseNumber?: string;
  vehicleType?: string;
  shift: {
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
  };
  status: 'active' | 'inactive' | 'busy' | 'offline';
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  performanceMetrics: {
    totalDeliveries: number;
    averageRating: number;
    onTimeDeliveryRate: number;
  };
}

export interface AdminExtension {
  roleLevel: 'superadmin' | 'ops' | 'support';
  permissions: string[];
  lastLoginAt?: Date;
  accessLevel: number;
}

@Schema({
  collection: 'customers',
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
export class Customer {
  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false, unique: true, sparse: true, index: true })
  email?: string;

  @Prop({
    type: String,
    enum: CustomerRole,
    default: CustomerRole.CUSTOMER,
    required: true,
    index: true,
  })
  role: CustomerRole;

  @Prop({ default: 0, min: 0 })
  walletBalance: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: {
          type: String,
          enum: ['home', 'office', 'other'],
          required: true,
        },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        landmark: { type: String },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  addresses: Array<{
    id: string;
    type: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // OTP fields for authentication
  @Prop({ select: false })
  otpCode?: string;

  @Prop({ select: false })
  otpExpiry?: Date;

  // Role-specific extensions
  @Prop({
    type: {
      loyaltyPoints: { type: Number, default: 0 },
      preferences: {
        preferredDeliveryTime: { type: String },
        specialInstructions: { type: String },
        notificationPreferences: {
          sms: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
        },
      },
    },
  })
  customerExtension?: CustomerExtension;

  @Prop({
    type: {
      kycStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      gstin: { type: String },
      bankAccountId: { type: Types.ObjectId },
      rating: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      businessMetrics: {
        totalRevenue: { type: Number, default: 0 },
        averageOrderValue: { type: Number, default: 0 },
        customerRetentionRate: { type: Number, default: 0 },
      },
    },
  })
  vendorExtension?: VendorExtension;

  @Prop({
    type: {
      licenseNumber: { type: String },
      vehicleType: { type: String },
      shift: {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        daysOfWeek: [{ type: String }],
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'busy', 'offline'],
        default: 'inactive',
      },
      currentLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        lastUpdated: { type: Date },
      },
      performanceMetrics: {
        totalDeliveries: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        onTimeDeliveryRate: { type: Number, default: 0 },
      },
    },
  })
  riderExtension?: RiderExtension;

  @Prop({
    type: {
      roleLevel: {
        type: String,
        enum: ['superadmin', 'ops', 'support'],
        default: 'support',
      },
      permissions: [{ type: String }],
      lastLoginAt: { type: Date },
      accessLevel: { type: Number, default: 1 },
    },
  })
  adminExtension?: AdminExtension;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Create indexes for performance optimization
CustomerSchema.index({ phone: 1 }, { unique: true });
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ role: 1 });
CustomerSchema.index({ isActive: 1 });
CustomerSchema.index({ 'addresses.pincode': 1 });
CustomerSchema.index({ 'addresses.latitude': 1, 'addresses.longitude': 1 });
CustomerSchema.index({ createdAt: -1 });

// Role-specific indexes
CustomerSchema.index({ 'vendorExtension.kycStatus': 1 });
CustomerSchema.index({ 'vendorExtension.rating': -1 });
CustomerSchema.index({ 'riderExtension.status': 1 });
CustomerSchema.index({
  'riderExtension.currentLocation.latitude': 1,
  'riderExtension.currentLocation.longitude': 1,
});

// Pre-save middleware to update timestamps
CustomerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update timestamps
CustomerSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Virtual for id
CustomerSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
CustomerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.otpCode;
    delete ret.otpExpiry;
    return ret;
  },
});
