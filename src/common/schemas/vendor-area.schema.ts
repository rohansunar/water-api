import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VendorAreaDocument = VendorArea & Document;

// GeoJSON Polygon interface for service areas
export interface ServiceAreaPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Array of linear rings (first is exterior, others are holes)
}

@Schema({
  collection: 'vendor_areas',
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
export class VendorArea {
  @Prop({ type: Types.ObjectId, ref: 'VendorStore', required: true })
  storeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true, maxlength: 16 })
  pincode: string;

  @Prop({ required: true, maxlength: 255 })
  areaName: string;

  @Prop({ maxlength: 64 })
  city?: string;

  @Prop({ maxlength: 64 })
  state?: string;

  // Service area boundary as GeoJSON Polygon
  @Prop({
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon',
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
      index: '2dsphere',
    },
  })
  polygon: ServiceAreaPolygon;

  // Delivery settings for this area
  @Prop({ default: 0, min: 0 })
  deliveryFee: number;

  @Prop({ default: 0, min: 0 })
  minimumOrderValue: number;

  @Prop({ default: 60, min: 15 }) // minutes
  maxDeliveryTime: number;

  @Prop({ default: 30, min: 10 }) // minutes
  estimatedDeliveryTime: number;

  @Prop({ default: true })
  isActive: boolean;

  // Priority for overlapping areas (higher number = higher priority)
  @Prop({ default: 1, min: 1, max: 10 })
  priority: number;

  // Service availability
  @Prop({
    type: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: false },
    },
    default: {},
  })
  serviceAvailability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };

  // Time slots for delivery in this area
  @Prop([
    {
      startTime: { type: String, required: true }, // HH:MM format
      endTime: { type: String, required: true }, // HH:MM format
      maxOrders: { type: Number, default: 10 },
      isActive: { type: Boolean, default: true },
    },
  ])
  deliverySlots: Array<{
    startTime: string;
    endTime: string;
    maxOrders: number;
    isActive: boolean;
  }>;

  // Statistics
  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalDeliveries: number;

  @Prop({ default: 0, min: 0, max: 100 }) // percentage
  onTimeDeliveryRate: number;

  @Prop({ default: 4.0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const VendorAreaSchema = SchemaFactory.createForClass(VendorArea);

// Create indexes for performance optimization
VendorAreaSchema.index({ storeId: 1 });
VendorAreaSchema.index({ vendorId: 1 });
VendorAreaSchema.index({ pincode: 1 });
VendorAreaSchema.index({ areaName: 1 });
VendorAreaSchema.index({ polygon: '2dsphere' }); // Geospatial index for polygon queries
VendorAreaSchema.index({ isActive: 1 });
VendorAreaSchema.index({ priority: -1 });
VendorAreaSchema.index({ createdAt: -1 });

// Compound indexes for common queries
VendorAreaSchema.index({ vendorId: 1, isActive: 1 });
VendorAreaSchema.index({ storeId: 1, isActive: 1 });
VendorAreaSchema.index({ pincode: 1, isActive: 1 });
VendorAreaSchema.index({ isActive: 1, priority: -1 });

// Method to check if a point is within the service area
VendorAreaSchema.methods.containsPoint = function (
  longitude: number,
  latitude: number,
): boolean {
  // This would typically use MongoDB's $geoWithin operator in a query
  // For now, we'll implement a basic point-in-polygon algorithm
  const point = [longitude, latitude];
  const polygon = this.polygon.coordinates[0]; // Exterior ring

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i][1] > point[1] !== polygon[j][1] > point[1] &&
      point[0] <
        ((polygon[j][0] - polygon[i][0]) * (point[1] - polygon[i][1])) /
          (polygon[j][1] - polygon[i][1]) +
          polygon[i][0]
    ) {
      inside = !inside;
    }
  }
  return inside;
};

// Method to check if delivery is available on a specific day
VendorAreaSchema.methods.isAvailableOnDay = function (
  dayName: string,
): boolean {
  return this.serviceAvailability[dayName.toLowerCase()] || false;
};

// Method to get available delivery slots for a specific day
VendorAreaSchema.methods.getAvailableSlots = function (
  dayName: string,
): Array<any> {
  if (!this.isAvailableOnDay(dayName)) {
    return [];
  }

  return this.deliverySlots.filter((slot) => slot.isActive);
};

// Method to calculate delivery fee based on order value
VendorAreaSchema.methods.calculateDeliveryFee = function (
  orderValue: number,
): number {
  if (orderValue >= this.minimumOrderValue) {
    return this.deliveryFee;
  }
  return this.deliveryFee + (this.minimumOrderValue - orderValue) * 0.1; // Additional fee for below minimum
};
