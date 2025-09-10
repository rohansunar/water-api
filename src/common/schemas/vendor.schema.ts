import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VendorDocument = Vendor & Document;

@Schema({
  collection: 'vendors',
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
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  businessAddress: string;

  @Prop()
  businessPhone?: string;

  @Prop()
  businessEmail?: string;

  @Prop()
  gstNumber?: string;

  @Prop()
  licenseNumber?: string;

  @Prop({
    type: {
      kycDoc: { type: String },
      businessLicense: { type: String },
      gstCertificate: { type: String },
      addressProof: { type: String },
    }
  })
  documents?: {
    kycDoc?: string;
    businessLicense?: string;
    gstCertificate?: string;
    addressProof?: string;
  };

  @Prop({
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  })
  approvalStatus: string;

  @Prop()
  rejectionReason?: string;

  @Prop([{
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    upiId: { type: String },
    isDefault: { type: Boolean, default: false },
  }])
  bankAccounts: Array<{
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
    upiId?: string;
    isDefault: boolean;
  }>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 4.0 })
  rating: number;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop([{
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radius: { type: Number, default: 5 }, // km
  }])
  deliveryZones: Array<{
    name: string;
    lat: number;
    lng: number;
    radius: number;
  }>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
