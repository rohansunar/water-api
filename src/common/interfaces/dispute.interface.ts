export interface Dispute {
  id: bigint;
  orderId: bigint;
  orderCreatedAt: Date;
  raisedBy: bigint;
  raisedByType: 'customer' | 'vendor' | 'admin';
  reason: string;
  description: string;
  status: DisputeStatus;
  priority: DisputePriority;
  category: DisputeCategory;
  evidence?: DisputeEvidence;
  resolution?: string;
  resolvedBy?: bigint;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum DisputePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum DisputeCategory {
  DELIVERY_DELAY = 'DELIVERY_DELAY',
  PRODUCT_QUALITY = 'PRODUCT_QUALITY',
  WRONG_ITEM = 'WRONG_ITEM',
  MISSING_ITEM = 'MISSING_ITEM',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  SERVICE_ISSUE = 'SERVICE_ISSUE',
  OTHER = 'OTHER',
}

export interface DisputeEvidence {
  images?: string[];
  messages?: DisputeMessage[];
  documents?: string[];
  additionalInfo?: Record<string, any>;
}

export interface DisputeMessage {
  id: string;
  senderId: bigint;
  senderType: 'customer' | 'vendor' | 'admin';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export interface DisputeHistory {
  id: bigint;
  disputeId: bigint;
  action: string;
  oldStatus?: DisputeStatus;
  newStatus?: DisputeStatus;
  performedBy: bigint;
  notes?: string;
  createdAt: Date;
}
