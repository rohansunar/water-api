// Ledger Entry Interface
export interface LedgerEntry {
  id: string;
  vendorId: string;
  orderId: string;
  userId: string;
  amount: number;
  type: LedgerEntryType;
  status: LedgerEntryStatus;
  description: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum LedgerEntryType {
  SALE = 'sale',
  REFUND = 'refund',
  COMMISSION = 'commission',
  PAYOUT = 'payout',
  ADJUSTMENT = 'adjustment',
}

export enum LedgerEntryStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Analytics Interface
export interface VendorAnalytics {
  vendorId: string;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  totalSales: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netEarnings: number;
  averageOrderValue: number;
  topProducts: ProductAnalytics[];
  salesTrend: SalesTrendData[];
}

export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  totalSales: number;
  totalRevenue: number;
  orderCount: number;
}

export interface SalesTrendData {
  date: Date;
  sales: number;
  orders: number;
  revenue: number;
}

// Payout Interface
export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  status: PayoutStatus;
  method: PayoutMethod;
  bankDetails?: BankDetails;
  upiDetails?: UpiDetails;
  transactionId?: string;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  UPI = 'upi',
  WALLET = 'wallet',
}

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
}

export interface UpiDetails {
  upiId: string;
  name: string;
}

// Ledger Summary Interface
export interface LedgerSummary {
  vendorId: string;
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalCommission: number;
  netBalance: number;
  lastPayoutDate?: Date;
  nextPayoutDate?: Date;
}
