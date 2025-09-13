import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({
  collection: 'addresses',
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
export class Address {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ maxlength: 64 })
  label?: string; // 'home', 'office', 'other'

  @Prop({ required: true, maxlength: 255 })
  line1: string; // Street address line 1

  @Prop({ maxlength: 255 })
  line2?: string; // Street address line 2

  @Prop({ required: true, maxlength: 64 })
  city: string;

  @Prop({ required: true, maxlength: 64 })
  state: string;

  @Prop({ required: true, maxlength: 64, default: 'IN' })
  country: string;

  @Prop({ required: true, maxlength: 16 })
  pincode: string;

  @Prop({ maxlength: 255 })
  landmark?: string;

  // Geospatial location using GeoJSON Point format
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere',
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Create indexes for performance optimization
AddressSchema.index({ userId: 1 });
AddressSchema.index({ pincode: 1 });
AddressSchema.index({ city: 1 });
AddressSchema.index({ state: 1 });
AddressSchema.index({ location: '2dsphere' }); // Geospatial index for location-based queries
AddressSchema.index({ userId: 1, isDefault: 1 });
AddressSchema.index({ userId: 1, isActive: 1 });
AddressSchema.index({ createdAt: -1 });

// Compound indexes for common queries
AddressSchema.index({ userId: 1, label: 1 });
AddressSchema.index({ pincode: 1, city: 1 });

// Pre-save middleware to ensure only one default address per user
AddressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other addresses of the same user
    await (this.constructor as any).updateMany(
      { 
        userId: this.userId, 
        _id: { $ne: this._id },
        isDefault: true 
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual for getting latitude and longitude separately
AddressSchema.virtual('latitude').get(function() {
  return this.location?.coordinates[1];
});

AddressSchema.virtual('longitude').get(function() {
  return this.location?.coordinates[0];
});

// Method to calculate distance from another point
AddressSchema.methods.distanceFrom = function(longitude: number, latitude: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - this.location.coordinates[1]) * Math.PI / 180;
  const dLon = (longitude - this.location.coordinates[0]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.coordinates[1] * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};
