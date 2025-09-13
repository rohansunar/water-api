import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComplaintDocument = Complaint & Document;

@Schema({
  collection: 'complaints',
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
export class Complaint {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  vendorId?: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['delivery_issue', 'product_quality', 'payment_issue', 'service_issue', 'billing_issue', 'app_issue', 'other'],
  })
  type: string;

  @Prop({ required: true, maxlength: 200 })
  subject: string;

  @Prop({ required: true, maxlength: 2000 })
  message: string;

  @Prop({ 
    required: true,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'escalated', 'rejected'],
    default: 'open',
  })
  status: string;

  @Prop({ 
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  // Assignment and handling
  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  assignedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId;

  // Resolution information
  @Prop({ maxlength: 2000 })
  resolution?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  closedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  closedBy?: Types.ObjectId;

  // Escalation tracking
  @Prop({ default: 0, min: 0 })
  escalationLevel: number;

  @Prop()
  escalatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  escalatedBy?: Types.ObjectId;

  @Prop({ maxlength: 500 })
  escalationReason?: string;

  // Attachments and evidence
  @Prop([{ type: String, maxlength: 500 }])
  attachments: string[];

  @Prop([{ type: String, maxlength: 500 }])
  evidenceFiles: string[];

  // Customer satisfaction
  @Prop({ min: 1, max: 5 })
  customerRating?: number;

  @Prop({ maxlength: 1000 })
  customerFeedback?: string;

  @Prop()
  feedbackAt?: Date;

  // SLA tracking
  @Prop()
  slaDeadline?: Date;

  @Prop({ default: false })
  isSlaBreached: boolean;

  @Prop()
  slaBreachedAt?: Date;

  // Response time tracking
  @Prop()
  firstResponseAt?: Date;

  @Prop({ min: 0 })
  firstResponseTime?: number; // in minutes

  @Prop({ min: 0 })
  resolutionTime?: number; // in minutes

  // Communication channel
  @Prop({ 
    enum: ['web', 'mobile', 'phone', 'email', 'chat', 'social_media'],
    default: 'web',
  })
  channel: string;

  // Contact information
  @Prop({ maxlength: 20 })
  contactPhone?: string;

  @Prop({ maxlength: 100 })
  contactEmail?: string;

  // Follow-up information
  @Prop({ default: false })
  requiresFollowUp: boolean;

  @Prop()
  followUpDate?: Date;

  @Prop({ maxlength: 500 })
  followUpNotes?: string;

  // Internal notes and tags
  @Prop({ maxlength: 2000 })
  internalNotes?: string;

  @Prop([{ type: String, maxlength: 50 }])
  tags: string[];

  // Compensation and refunds
  @Prop({ default: 0, min: 0 })
  compensationAmount: number;

  @Prop({ 
    enum: ['none', 'refund', 'credit', 'discount', 'replacement', 'other'],
    default: 'none',
  })
  compensationType: string;

  @Prop({ maxlength: 500 })
  compensationDetails?: string;

  @Prop({ default: false })
  compensationProcessed: boolean;

  @Prop()
  compensationProcessedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);

// Complaint Response Schema for tracking responses/communications
@Schema({
  collection: 'complaint_responses',
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
export class ComplaintResponse {
  @Prop({ type: Types.ObjectId, ref: 'Complaint', required: true })
  complaintId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  responderId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['customer_support', 'vendor', 'delivery_agent', 'admin', 'system'],
  })
  responderType: string;

  @Prop({ required: true, maxlength: 2000 })
  message: string;

  @Prop([{ type: String, maxlength: 500 }])
  attachments: string[];

  @Prop({ default: false })
  isInternal: boolean; // Internal communication not visible to customer

  @Prop({ 
    enum: ['response', 'status_update', 'escalation', 'resolution', 'follow_up'],
    default: 'response',
  })
  responseType: string;

  @Prop({ default: false })
  isAutoGenerated: boolean;

  @Prop({ default: false })
  customerNotified: boolean;

  @Prop()
  notifiedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ComplaintResponseSchema = SchemaFactory.createForClass(ComplaintResponse);

// Create indexes for Complaint
ComplaintSchema.index({ userId: 1 });
ComplaintSchema.index({ orderId: 1 });
ComplaintSchema.index({ subscriptionId: 1 });
ComplaintSchema.index({ vendorId: 1 });
ComplaintSchema.index({ type: 1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ assignedTo: 1 });
ComplaintSchema.index({ channel: 1 });
ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ slaDeadline: 1 });

// Compound indexes for common queries
ComplaintSchema.index({ status: 1, priority: -1 });
ComplaintSchema.index({ assignedTo: 1, status: 1 });
ComplaintSchema.index({ userId: 1, status: 1 });
ComplaintSchema.index({ vendorId: 1, status: 1 });
ComplaintSchema.index({ type: 1, status: 1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });

// Create indexes for ComplaintResponse
ComplaintResponseSchema.index({ complaintId: 1 });
ComplaintResponseSchema.index({ responderId: 1 });
ComplaintResponseSchema.index({ responderType: 1 });
ComplaintResponseSchema.index({ responseType: 1 });
ComplaintResponseSchema.index({ isInternal: 1 });
ComplaintResponseSchema.index({ createdAt: -1 });

// Compound indexes
ComplaintResponseSchema.index({ complaintId: 1, createdAt: -1 });
ComplaintResponseSchema.index({ complaintId: 1, isInternal: 1 });

// Pre-save middleware for Complaint to calculate SLA and response times
ComplaintSchema.pre('save', function(next) {
  const now = new Date();
  
  // Set SLA deadline based on priority (if not already set)
  if (this.isNew && !this.slaDeadline) {
    const slaHours = {
      urgent: 2,
      high: 8,
      medium: 24,
      low: 72,
    };
    
    this.slaDeadline = new Date(now.getTime() + (slaHours[this.priority] * 60 * 60 * 1000));
  }
  
  // Check for SLA breach
  if (this.slaDeadline && now > this.slaDeadline && this.status !== 'resolved' && this.status !== 'closed') {
    this.isSlaBreached = true;
    if (!this.slaBreachedAt) {
      this.slaBreachedAt = now;
    }
  }
  
  // Calculate resolution time when resolved
  if (this.isModified('status') && this.status === 'resolved' && !this.resolutionTime) {
    this.resolvedAt = now;
    this.resolutionTime = Math.round((now.getTime() - this.createdAt.getTime()) / (1000 * 60)); // minutes
  }
  
  next();
});

// Complaint methods
ComplaintSchema.methods.isOpen = function(): boolean {
  return ['open', 'in_progress', 'escalated'].includes(this.status);
};

ComplaintSchema.methods.canBeEscalated = function(): boolean {
  return this.isOpen() && this.escalationLevel < 3; // Max 3 escalation levels
};

ComplaintSchema.methods.isOverdue = function(): boolean {
  return this.slaDeadline ? new Date() > this.slaDeadline : false;
};

ComplaintSchema.methods.getAgeInHours = function(): number {
  return Math.round((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
};

ComplaintSchema.methods.requiresUrgentAttention = function(): boolean {
  return this.priority === 'urgent' || 
         this.isSlaBreached || 
         (this.escalationLevel > 0 && this.isOpen());
};
