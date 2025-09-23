import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeliveryTaskDocument = DeliveryTask & Document;

@Schema({
  collection: 'delivery_tasks',
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
export class DeliveryTask {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VendorStore' })
  storeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  driverId?: Types.ObjectId; // Reference to user with rider role

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ 
    enum: ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'], 
    default: 'assigned' 
  })
  status: string;

  // Delivery details
  @Prop({ maxlength: 10 })
  otp?: string;

  @Prop([{ type: String, maxlength: 500 }])
  proofPhotos: string[];

  @Prop({ maxlength: 1000 })
  deliveryNotes?: string;

  @Prop({ maxlength: 500 })
  failureReason?: string;

  // Timing information
  @Prop()
  assignedAt?: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  pickedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  estimatedDeliveryTime?: Date;

  @Prop()
  actualDeliveryTime?: Date;

  // Location tracking
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  })
  pickupLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  })
  deliveryLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Driver tracking
  @Prop([
    {
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
        },
      },
      timestamp: { type: Date, default: Date.now },
      speed: { type: Number }, // km/h
      heading: { type: Number }, // degrees
    },
  ])
  trackingHistory: Array<{
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    timestamp: Date;
    speed?: number;
    heading?: number;
  }>;

  // Delivery attempt tracking
  @Prop([
    {
      attemptNumber: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
      status: { type: String, required: true },
      notes: { type: String, maxlength: 500 },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
        },
      },
    },
  ])
  deliveryAttempts: Array<{
    attemptNumber: number;
    timestamp: Date;
    status: string;
    notes?: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;

  // Performance metrics
  @Prop({ min: 0 })
  distanceTraveled?: number; // in kilometers

  @Prop({ min: 0 })
  travelTime?: number; // in minutes

  @Prop({ min: 0 })
  waitTime?: number; // in minutes

  // Customer interaction
  @Prop({ min: 1, max: 5 })
  customerRating?: number;

  @Prop({ maxlength: 1000 })
  customerFeedback?: string;

  @Prop()
  feedbackAt?: Date;

  // Financial information
  @Prop({ default: 0, min: 0 })
  deliveryFee: number;

  @Prop({ default: 0, min: 0 })
  driverCommission: number;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  paidAt?: Date;

  // Priority and urgency
  @Prop({ 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  })
  priority: string;

  @Prop({ default: false })
  isExpress: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const DeliveryTaskSchema = SchemaFactory.createForClass(DeliveryTask);

// Create indexes for performance optimization
DeliveryTaskSchema.index({ orderId: 1 });
DeliveryTaskSchema.index({ vendorId: 1 });
DeliveryTaskSchema.index({ storeId: 1 });
DeliveryTaskSchema.index({ driverId: 1 });
DeliveryTaskSchema.index({ customerId: 1 });
DeliveryTaskSchema.index({ status: 1 });
DeliveryTaskSchema.index({ priority: 1 });
DeliveryTaskSchema.index({ estimatedDeliveryTime: 1 });
DeliveryTaskSchema.index({ createdAt: -1 });

// Geospatial indexes
DeliveryTaskSchema.index({ pickupLocation: '2dsphere' });
DeliveryTaskSchema.index({ deliveryLocation: '2dsphere' });

// Compound indexes for common queries
DeliveryTaskSchema.index({ driverId: 1, status: 1 });
DeliveryTaskSchema.index({ vendorId: 1, status: 1 });
DeliveryTaskSchema.index({ status: 1, priority: -1 });
DeliveryTaskSchema.index({ status: 1, estimatedDeliveryTime: 1 });
DeliveryTaskSchema.index({ driverId: 1, createdAt: -1 });

// Pre-save middleware to generate OTP and update timing
DeliveryTaskSchema.pre('save', function(next) {
  // Generate OTP when task is assigned
  if (this.isNew && !this.otp) {
    this.otp = Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // Update timing based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'assigned':
        this.assignedAt = now;
        break;
      case 'accepted':
        this.acceptedAt = now;
        break;
      case 'picked_up':
        this.pickedAt = now;
        break;
      case 'delivered':
        this.deliveredAt = now;
        this.actualDeliveryTime = now;
        break;
    }
  }
  
  next();
});

// Method to calculate delivery time
DeliveryTaskSchema.methods.getDeliveryDuration = function(): number | null {
  if (this.assignedAt && this.deliveredAt) {
    return Math.round((this.deliveredAt.getTime() - this.assignedAt.getTime()) / (1000 * 60)); // minutes
  }
  return null;
};

// Method to check if delivery is overdue
DeliveryTaskSchema.methods.isOverdue = function(): boolean {
  if (!this.estimatedDeliveryTime || this.status === 'delivered') {
    return false;
  }
  return new Date() > this.estimatedDeliveryTime;
};

// Method to get current location (latest tracking point)
DeliveryTaskSchema.methods.getCurrentLocation = function(): any {
  if (this.trackingHistory.length === 0) {
    return null;
  }
  return this.trackingHistory[this.trackingHistory.length - 1];
};

// Method to add tracking point
DeliveryTaskSchema.methods.addTrackingPoint = function(longitude: number, latitude: number, speed?: number, heading?: number): void {
  this.trackingHistory.push({
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    timestamp: new Date(),
    speed,
    heading,
  });
};
