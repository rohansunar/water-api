import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true, enum: ['home', 'office', 'other'] })
  type: string;

  @Prop({ required: true })
  street: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop({ required: true })
  pincode: string;

  @Prop()
  landmark?: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
