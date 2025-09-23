import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../interfaces/user.interface';

export type UserDocument = User & Document;

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
  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  monthlyPaymentMode: boolean;

  @Prop()
  lastActiveAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Role-specific extensions as embedded documents
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
        startTime: { type: String },
        endTime: { type: String },
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

  @Prop([
    {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      contactPhone: { type: String, required: true },
      isDefault: { type: Boolean, default: false },
      label: { type: String }, // 'home', 'office', 'other'
      landmark: { type: String },
    },
  ])
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    contactPhone: string;
    isDefault: boolean;
    label?: string;
    landmark?: string;
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

// Create indexes for performance optimization
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ 'addresses.pincode': 1 });
UserSchema.index({ 'addresses.latitude': 1, 'addresses.longitude': 1 });
UserSchema.index({ createdAt: -1 });

// Role-specific indexes
UserSchema.index({ 'vendorExtension.kycStatus': 1 });
UserSchema.index({ 'vendorExtension.rating': -1 });
UserSchema.index({ 'riderExtension.status': 1 });
UserSchema.index({
  'riderExtension.currentLocation.latitude': 1,
  'riderExtension.currentLocation.longitude': 1,
});

// Pre-save middleware to initialize role extensions
UserSchema.pre('save', function (next) {
  // Initialize role-specific extensions based on user role
  if (this.isNew) {
    switch (this.role) {
      case UserRole.CUSTOMER:
        if (!this.customerExtension) {
          this.customerExtension = {
            loyaltyPoints: 0,
            preferences: {
              notificationPreferences: {
                sms: true,
                email: true,
                push: true,
              },
            },
          };
        }
        break;
      case UserRole.VENDOR:
        if (!this.vendorExtension) {
          this.vendorExtension = {
            kycStatus: 'pending',
            rating: 0,
            totalOrders: 0,
            businessMetrics: {
              totalRevenue: 0,
              averageOrderValue: 0,
              customerRetentionRate: 0,
            },
          };
        }
        break;
      case UserRole.DELIVERY_RIDER:
        if (!this.riderExtension) {
          this.riderExtension = {
            shift: {
              startTime: '09:00',
              endTime: '18:00',
              daysOfWeek: [
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
              ],
            },
            status: 'inactive',
            performanceMetrics: {
              totalDeliveries: 0,
              averageRating: 0,
              onTimeDeliveryRate: 0,
            },
          };
        }
        break;
      case UserRole.ADMIN:
        if (!this.adminExtension) {
          this.adminExtension = {
            roleLevel: 'support',
            permissions: [],
            accessLevel: 1,
          };
        }
        break;
    }
  }
  next();
});
