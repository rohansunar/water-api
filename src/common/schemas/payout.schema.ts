import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PayoutDocument = Payout & Document;

@Schema({ timestamps: true })
export class Payout {
  @Prop({ required: true })
  vendorId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  status: string; // 'pending' | 'processing' | 'completed' | 'failed'

  @Prop()
  method?: string; // 'bank_transfer' | 'upi' | 'wallet'

  @Prop()
  transactionId?: string;

  @Prop({
    type: {
      bankAccountNumber: { type: String },
      ifscCode: { type: String },
      accountHolderName: { type: String },
      bankName: { type: String },
      upiId: { type: String },
    },
    required: false,
  })
  payoutDetails?: {
    bankAccountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    bankName?: string;
    upiId?: string;
  };

  @Prop()
  completedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);
