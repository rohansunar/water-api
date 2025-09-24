import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliveryTaskDocument = DeliveryTask & Document;

@Schema({ timestamps: true })
export class DeliveryTask {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  riderId: string;

  @Prop({ required: true })
  status: string; // 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'

  @Prop()
  assignedAt?: Date;

  @Prop()
  pickedUpAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object })
  location?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const DeliveryTaskSchema = SchemaFactory.createForClass(DeliveryTask);
