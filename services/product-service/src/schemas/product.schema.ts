import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({
  timestamps: true,
  collection: 'products',
})
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  unit: string; // 'bottle', 'jar', 'gallon', etc.

  @Prop({ required: true })
  capacity: number; // in liters

  @Prop({ required: true })
  stockQuantity: number;

  @Prop({ required: true, ref: 'Vendor' })
  vendorId: string;

  @Prop({ default: false })
  hasDeposit: boolean;

  @Prop({ default: 0 })
  depositAmount: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({
    type: {
      minQuantity: { type: Number, default: 1 },
      maxQuantity: { type: Number, default: 100 },
    },
    default: { minQuantity: 1, maxQuantity: 100 },
  })
  orderLimits: {
    minQuantity: number;
    maxQuantity: number;
  };

  @Prop({
    type: {
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
    },
  })
  specifications?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create indexes for better performance
ProductSchema.index({ vendorId: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1, isAvailable: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ createdAt: -1 });
