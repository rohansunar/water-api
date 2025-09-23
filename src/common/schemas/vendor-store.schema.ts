import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VendorStoreDocument = VendorStore & Document;

export interface ActiveHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string; // HH:MM format
    closeTime: string; // HH:MM format
    breakStart?: string;
    breakEnd?: string;
  };
}

@Schema({
  collection: 'vendor_stores',
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
export class VendorStore {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true, maxlength: 255 })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Address' })
  addressId?: Types.ObjectId;

  @Prop({ maxlength: 20 })
  phone?: string;

  @Prop({ maxlength: 255 })
  email?: string;

  @Prop({ maxlength: 500 })
  description?: string;

  // Store operating hours
  @Prop({
    type: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '16:00' },
        breakStart: { type: String },
        breakEnd: { type: String },
      },
    },
    default: {},
  })
  activeHours: ActiveHours;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 4.0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  // Store capacity and limits
  @Prop({ default: 100 })
  maxDailyOrders: number;

  @Prop({ default: 10 })
  maxConcurrentOrders: number;

  // Store settings
  @Prop({
    type: {
      autoAcceptOrders: { type: Boolean, default: false },
      preparationTime: { type: Number, default: 30 }, // minutes
      deliveryRadius: { type: Number, default: 10 }, // kilometers
      minimumOrderValue: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      freeDeliveryThreshold: { type: Number, default: 500 },
    },
    default: {},
  })
  settings: {
    autoAcceptOrders: boolean;
    preparationTime: number;
    deliveryRadius: number;
    minimumOrderValue: number;
    deliveryFee: number;
    freeDeliveryThreshold: number;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const VendorStoreSchema = SchemaFactory.createForClass(VendorStore);

// Create indexes for performance optimization
VendorStoreSchema.index({ vendorId: 1 });
VendorStoreSchema.index({ isActive: 1 });
VendorStoreSchema.index({ rating: -1 });
VendorStoreSchema.index({ totalOrders: -1 });
VendorStoreSchema.index({ createdAt: -1 });

// Compound indexes for common queries
VendorStoreSchema.index({ vendorId: 1, isActive: 1 });
VendorStoreSchema.index({ isActive: 1, rating: -1 });

// Method to check if store is currently open
VendorStoreSchema.methods.isCurrentlyOpen = function (): boolean {
  const now = new Date();
  const dayName = now
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const daySchedule = this.activeHours[dayName];
  if (!daySchedule || !daySchedule.isOpen) {
    return false;
  }

  return (
    currentTime >= daySchedule.openTime && currentTime <= daySchedule.closeTime
  );
};

// Method to get next opening time
VendorStoreSchema.methods.getNextOpeningTime = function (): Date | null {
  const now = new Date();
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayName = days[checkDate.getDay()];

    const daySchedule = this.activeHours[dayName];
    if (daySchedule && daySchedule.isOpen) {
      const [hours, minutes] = daySchedule.openTime.split(':').map(Number);
      checkDate.setHours(hours, minutes, 0, 0);

      if (checkDate > now) {
        return checkDate;
      }
    }
  }

  return null;
};
