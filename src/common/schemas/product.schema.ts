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
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VendorStore' })
  storeId?: Types.ObjectId;

  @Prop({ unique: true, maxlength: 128 })
  sku?: string; // Stock Keeping Unit

  @Prop({ required: true, maxlength: 255 })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: Object.values(ProductCategory) })
  category: ProductCategory;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  mrp?: number; // Maximum Retail Price

  @Prop({ required: true })
  capacity: string; // e.g., "20L", "1L"

  @Prop({ required: true, maxlength: 32 })
  unit: string; // e.g., "jar", "bottle"

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

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
  };

  // Pricing and discounts
  @Prop({
    type: {
      discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
      discountStartDate: { type: Date },
      discountEndDate: { type: Date },
      bulkPricing: [
        {
          minQuantity: { type: Number, min: 1 },
          price: { type: Number, min: 0 },
        },
      ],
    },
    required: false,
  })
  pricing: {
    discountPercentage: number;
    discountStartDate?: Date;
    discountEndDate?: Date;
    bulkPricing: Array<{
      minQuantity: number;
      price: number;
    }>;
  };

  // Inventory management
  @Prop({
    type: {
      lowStockThreshold: { type: Number, default: 10, min: 0 },
      reorderLevel: { type: Number, default: 20, min: 0 },
      maxStockLevel: { type: Number, default: 1000, min: 0 },
      lastRestockedAt: { type: Date },
      stockLocation: { type: String, maxlength: 100 },
    },
    required: false,
  })
  inventory: {
    lowStockThreshold: number;
    reorderLevel: number;
    maxStockLevel: number;
    lastRestockedAt?: Date;
    stockLocation?: string;
  };

  // Product performance metrics
  @Prop({ default: 4.0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0, min: 0 })
  totalReviews: number;

  @Prop({ default: 0, min: 0 })
  totalOrders: number;

  @Prop({ default: 0, min: 0 })
  totalSales: number; // Total quantity sold

  @Prop({ default: 0, min: 0 })
  revenue: number; // Total revenue generated

  // SEO and search optimization
  @Prop([{ type: String, maxlength: 50 }])
  tags: string[];

  @Prop({ maxlength: 160 })
  metaDescription?: string;

  @Prop([{ type: String, maxlength: 100 }])
  searchKeywords: string[];

  // Product status and lifecycle
  @Prop({
    enum: ['draft', 'active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active',
  })
  status: string;

  @Prop()
  discontinuedAt?: Date;

  @Prop({ maxlength: 500 })
  discontinuationReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create indexes for performance optimization
ProductSchema.index({ vendorId: 1 });
ProductSchema.index({ storeId: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isAvailable: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ totalOrders: -1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes for common queries
ProductSchema.index({ vendorId: 1, isAvailable: 1 });
ProductSchema.index({ vendorId: 1, status: 1 });
ProductSchema.index({ storeId: 1, isAvailable: 1 });
ProductSchema.index({ category: 1, isAvailable: 1 });
ProductSchema.index({ isAvailable: 1, rating: -1 });
ProductSchema.index({ areaPincodes: 1, isAvailable: 1 });

// Text search index for product search
ProductSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  searchKeywords: 'text',
});

// Pre-save middleware to generate SKU if not provided
ProductSchema.pre('save', function (next) {
  if (this.isNew && !this.sku) {
    // Generate SKU: VENDOR_ID + CATEGORY + TIMESTAMP
    const vendorPrefix = this.vendorId.toString().slice(-4).toUpperCase();
    const categoryPrefix = this.category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${vendorPrefix}-${categoryPrefix}-${timestamp}`;
  }

  // Update pricing based on discount
  if (this.pricing?.discountPercentage > 0) {
    const now = new Date();
    const discountActive =
      (!this.pricing.discountStartDate ||
        now >= this.pricing.discountStartDate) &&
      (!this.pricing.discountEndDate || now <= this.pricing.discountEndDate);

    if (!discountActive) {
      this.pricing.discountPercentage = 0;
    }
  }

  next();
});

// Method to check if product is in stock
ProductSchema.methods.isInStock = function (quantity: number = 1): boolean {
  return this.stock >= quantity && this.isAvailable && this.status === 'active';
};

// Method to get effective price (considering discounts and bulk pricing)
ProductSchema.methods.getEffectivePrice = function (
  quantity: number = 1,
): number {
  let effectivePrice = this.price;

  // Check for bulk pricing
  if (this.pricing?.bulkPricing?.length > 0) {
    const applicableBulkPrice = this.pricing.bulkPricing
      .filter((bp: any) => quantity >= bp.minQuantity)
      .sort((a: any, b: any) => b.minQuantity - a.minQuantity)[0];

    if (applicableBulkPrice) {
      effectivePrice = applicableBulkPrice.price;
    }
  }

  // Apply discount if active
  if (this.pricing?.discountPercentage > 0) {
    const now = new Date();
    const discountActive =
      (!this.pricing.discountStartDate ||
        now >= this.pricing.discountStartDate) &&
      (!this.pricing.discountEndDate || now <= this.pricing.discountEndDate);

    if (discountActive) {
      effectivePrice =
        effectivePrice * (1 - this.pricing.discountPercentage / 100);
    }
  }

  return Math.round(effectivePrice * 100) / 100; // Round to 2 decimal places
};

// Method to check if product is available in a specific area
ProductSchema.methods.isAvailableInArea = function (pincode: string): boolean {
  return this.areaPincodes.length === 0 || this.areaPincodes.includes(pincode);
};

// Method to update stock
ProductSchema.methods.updateStock = function (
  quantity: number,
  operation: 'add' | 'subtract' = 'subtract',
): void {
  if (operation === 'add') {
    this.stock += quantity;
  } else {
    this.stock = Math.max(0, this.stock - quantity);
  }

  // Update status based on stock level
  if (this.stock === 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock' && this.stock > 0) {
    this.status = 'active';
  }
};
