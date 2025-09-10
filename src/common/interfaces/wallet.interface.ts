export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string; // Order ID, Topup ID, etc.
  referenceType?: ReferenceType;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

export enum ReferenceType {
  ORDER = 'order',
  TOPUP = 'topup',
  REFUND = 'refund',
  CASHBACK = 'cashback',
  PENALTY = 'penalty'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface TopupRequest {
  userId: string;
  amount: number;
  paymentMethod: string;
}
