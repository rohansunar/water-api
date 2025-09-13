import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderItemDocument = OrderItem & Document;

@Schema({
  collection: 'order_items',
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
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  // Product details at the time of order (for historical accuracy)
  @Prop({ required: true, maxlength: 255 })
  productName: string;

  @Prop({ maxlength: 128 })
  productSku?: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  // Pricing breakdown
  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercentage: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0, max: 100 })
  taxPercentage: number;

  // Product specifications at time of order
  @Prop({
    capacity: { type: String },
    unit: { type: String },
    brand: { type: String },
    category: { type: String },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
  })
  productSpecs: {
    capacity?: string;
    unit?: string;
    brand?: string;
    category?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };

  // Item status (for partial fulfillment)
  @Prop({ 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop({ min: 0 })
  deliveredQuantity?: number;

  @Prop({ maxlength: 500 })
  notes?: string;

  // Return/refund information
  @Prop({ min: 0 })
  returnedQuantity?: number;

  @Prop({ min: 0 })
  refundedAmount?: number;

  @Prop({ maxlength: 500 })
  returnReason?: string;

  @Prop()
  returnedAt?: Date;

  // Quality and feedback
  @Prop({ min: 1, max: 5 })
  itemRating?: number;

  @Prop({ maxlength: 500 })
  itemFeedback?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Create indexes for performance optimization
OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ productId: 1 });
OrderItemSchema.index({ status: 1 });
OrderItemSchema.index({ createdAt: -1 });

// Compound indexes for common queries
OrderItemSchema.index({ orderId: 1, status: 1 });
OrderItemSchema.index({ productId: 1, createdAt: -1 });
OrderItemSchema.index({ orderId: 1, productId: 1 });

// Pre-save middleware to calculate total price
OrderItemSchema.pre('save', function(next) {
  // Calculate total price before discount and tax
  const baseTotal = this.unitPrice * this.quantity;
  
  // Apply discount
  let discountedTotal = baseTotal;
  if (this.discountPercentage > 0) {
    this.discountAmount = (baseTotal * this.discountPercentage) / 100;
    discountedTotal = baseTotal - this.discountAmount;
  } else if (this.discountAmount > 0) {
    this.discountPercentage = (this.discountAmount / baseTotal) * 100;
    discountedTotal = baseTotal - this.discountAmount;
  }
  
  // Apply tax
  if (this.taxPercentage > 0) {
    this.taxAmount = (discountedTotal * this.taxPercentage) / 100;
  }
  
  // Set final total price
  this.totalPrice = discountedTotal + this.taxAmount;
  
  next();
});

// Method to calculate net amount (after discount, before tax)
OrderItemSchema.methods.getNetAmount = function(): number {
  return (this.unitPrice * this.quantity) - this.discountAmount;
};

// Method to calculate gross amount (final amount including tax)
OrderItemSchema.methods.getGrossAmount = function(): number {
  return this.totalPrice;
};

// Method to check if item can be returned
OrderItemSchema.methods.canBeReturned = function(): boolean {
  const nonReturnableStatuses = ['cancelled', 'pending'];
  const maxReturnDays = 7; // 7 days return policy
  const daysSinceDelivery = (Date.now() - this.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  return !nonReturnableStatuses.includes(this.status) && 
         daysSinceDelivery <= maxReturnDays &&
         (this.returnedQuantity || 0) < this.deliveredQuantity;
};

// Method to get returnable quantity
OrderItemSchema.methods.getReturnableQuantity = function(): number {
  const delivered = this.deliveredQuantity || 0;
  const returned = this.returnedQuantity || 0;
  return Math.max(0, delivered - returned);
};
