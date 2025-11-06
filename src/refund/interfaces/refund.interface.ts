export interface Refund {
  id: bigint;
  orderId: bigint;
  orderCreatedAt: Date;
  amount: number;
  reason: string;
  status: RefundStatus;
  refundMethod?: string;
  transactionId?: string;
  processedBy?: bigint;
  processedAt?: Date;
  approvedBy?: bigint;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface RefundHistory {
  id: bigint;
  refundId: bigint;
  action: string;
  oldStatus: RefundStatus;
  newStatus: RefundStatus;
  performedBy: bigint;
  notes?: string;
  createdAt: Date;
}
