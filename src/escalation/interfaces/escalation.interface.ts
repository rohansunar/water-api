import { DisputePriority } from '../../dispute/interfaces/dispute.interface';

export interface Escalation {
  id: bigint;
  disputeId: bigint;
  escalatedBy: bigint;
  escalatedTo: string;
  reason: string;
  priority: DisputePriority;
  status: EscalationStatus;
  resolvedBy?: bigint;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EscalationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface EscalationHistory {
  id: bigint;
  escalationId: bigint;
  action: string;
  oldStatus?: EscalationStatus;
  newStatus?: EscalationStatus;
  performedBy: bigint;
  notes?: string;
  createdAt: Date;
}