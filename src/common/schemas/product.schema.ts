import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  vendorId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  subcategory?: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop()
  description?: string;

  @Prop({ required: true })
  capacity: string; // e.g., "20L", "1L"

  @Prop({ required: true, maxlength: 32 })
  unit: string; // e.g., "jar", "bottle"

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: 0, min: 0 })
  stockQuantity: number; // Alias for stock for backward compatibility

  @Prop({ default: false })
  isActive: boolean; // Alias for isAvailable for backward compatibility

  @Prop({ default: 1, min: 1 })
  minOrderQuantity: number;

  @Prop({ default: 1000, min: 1 })
  maxOrderQuantity: number;

  // Area-specific availability (pincodes where this product is available)
  @Prop([{ type: String, maxlength: 16 }])
  areaPincodes: string[];

  @Prop([{ type: String, maxlength: 500 }])
  images: string[];

  @Prop({
    type: {
      weight: { type: Number, min: 0 },
      dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
      },
      material: { type: String, maxlength: 100 },
      brand: { type: String, maxlength: 100 },
      color: { type: String, maxlength: 50 },
      warranty: { type: String, maxlength: 100 },
      sku: { type: String, maxlength: 100 },
      areaPincodes: [{ type: String, maxlength: 16 }],
    },
    required: false,
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
    color?: string;
    warranty?: string;
    sku?: string;
    areaPincodes?: string[];
  };

  @Prop([{
    storeId: { type: String, required: true },
    price: { type: Number, min: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    isAvailable: { type: Boolean, default: true },
    areaPincodes: [{ type: String, maxlength: 16 }],
  }])
  storeMappings?: {
    storeId: string;
    price?: number;
    stockQuantity?: number;
    reservedStock?: number;
    isAvailable?: boolean;
    areaPincodes?: string[];
  }[];

  // Deposit system properties
  @Prop({ default: false })
  hasDeposit: boolean;

  @Prop({ default: 0, min: 0 })
  depositAmount: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
