import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VendorStoreDocument = VendorStore & Document;

@Schema({ timestamps: true })
export class VendorStore {
  @Prop({ required: true })
  vendorId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop()
  phone?: string;

  @Prop({ type: Object })
  activeHours?: Record<string, any>;

  @Prop({ default: 4.0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const VendorStoreSchema = SchemaFactory.createForClass(VendorStore);
