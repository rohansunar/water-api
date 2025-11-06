export interface Complaint {
  id: string;
  userId: string;
  orderId?: string;
  subscriptionId?: string;
  type: ComplaintType;
  subject: string;
  message: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: string;
  resolution?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface ComplaintResponse {
  id: string;
  complaintId: string;
  responderId: string;
  responderType: ResponderType;
  message: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: Date;
}

export enum ComplaintType {
  DELIVERY_ISSUE = 'delivery_issue',
  PRODUCT_QUALITY = 'product_quality',
  PAYMENT_ISSUE = 'payment_issue',
  SERVICE_ISSUE = 'service_issue',
  BILLING_ISSUE = 'billing_issue',
  OTHER = 'other',
}

export enum ComplaintStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ResponderType {
  CUSTOMER_SUPPORT = 'customer_support',
  VENDOR = 'vendor',
  DELIVERY_AGENT = 'delivery_agent',
  ADMIN = 'admin',
}
