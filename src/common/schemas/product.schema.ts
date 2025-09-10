import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductCategory } from '../interfaces/product.interface';

export type ProductDocument = Product & Document;

@Schema({
  collection: 'products',
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
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: Object.values(ProductCategory) })
  category: ProductCategory;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  capacity: string; // e.g., "20L", "1L"

  @Prop({ required: true })
  unit: string; // e.g., "jar", "bottle"

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop([String])
  images: string[];

  @Prop({
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    material: { type: String },
    brand: { type: String },
  })
  specifications: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    material?: string;
    brand?: string;
  };

  @Prop({ default: 0 })
  minOrderQuantity: number;

  @Prop({ default: 100 })
  maxOrderQuantity: number;

  @Prop({ default: 4.0 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
