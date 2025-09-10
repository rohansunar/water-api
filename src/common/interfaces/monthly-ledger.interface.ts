export interface MonthlyLedger {
  id: string;
  userId: string;
  vendorId: string;
  orderId: string;
  rate: number;
  quantity: number;
  deliveryDate: Date;
  status: MonthlyLedgerStatus;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum MonthlyLedgerStatus {
  UNPAID = 'unpaid',
  PAID = 'paid'
}

export interface MonthlyInvoice {
  id: string;
  userId: string;
  vendorId: string;
  month: number;
  year: number;
  totalAmount: number;
  dueDate: Date;
  status: InvoiceStatus;
  pdfUrl?: string;
  ledgerEntries: MonthlyLedger[];
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue'
}

export interface MonthlyBillingSummary {
  userId: string;
  vendorId: string;
  month: number;
  year: number;
  totalDeliveries: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  ledgerEntries: MonthlyLedger[];
}

export interface InvoiceGenerationRequest {
  month: number;
  year: number;
  userIds?: string[];
  vendorIds?: string[];
}
