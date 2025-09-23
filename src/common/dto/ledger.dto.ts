import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
  Min,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  AnalyticsPeriod,
  PayoutStatus,
  PayoutMethod,
  BankDetails,
  UpiDetails,
} from '../interfaces/ledger.interface';

// Ledger Entry DTOs
export class CreateLedgerEntryDto {
  @IsString()
  vendorId: string;

  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(LedgerEntryType)
  type: LedgerEntryType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateLedgerEntryDto {
  @IsOptional()
  @IsEnum(LedgerEntryStatus)
  status?: LedgerEntryStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class LedgerEntryResponseDto {
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

// Analytics DTOs
export class GetAnalyticsDto {
  @IsEnum(AnalyticsPeriod)
  period: AnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ProductAnalyticsDto {
  productId: string;
  productName: string;
  totalSales: number;
  totalRevenue: number;
  orderCount: number;
}

export class SalesTrendDataDto {
  date: Date;
  sales: number;
  orders: number;
  revenue: number;
}

export class VendorAnalyticsResponseDto {
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
  topProducts: ProductAnalyticsDto[];
  salesTrend: SalesTrendDataDto[];
}

// Payout DTOs
export class BankDetailsDto {
  @IsString()
  accountNumber: string;

  @IsString()
  ifscCode: string;

  @IsString()
  accountHolderName: string;

  @IsString()
  bankName: string;
}

export class UpiDetailsDto {
  @IsString()
  upiId: string;

  @IsString()
  name: string;
}

export class CreatePayoutDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpiDetailsDto)
  upiDetails?: UpiDetailsDto;
}

export class PayoutResponseDto {
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

// Ledger Summary DTO
export class LedgerSummaryResponseDto {
  vendorId: string;
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalCommission: number;
  netBalance: number;
  lastPayoutDate?: Date;
  nextPayoutDate?: Date;
}
