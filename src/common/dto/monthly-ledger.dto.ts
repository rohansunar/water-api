import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MonthlyLedgerStatus, InvoiceStatus } from '../interfaces/monthly-ledger.interface';

export class CreateMonthlyLedgerDto {
  @IsString()
  userId: string;

  @IsString()
  vendorId: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsDateString()
  deliveryDate: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2020)
  year: number;
}

export class UpdateMonthlyLedgerDto {
  @IsOptional()
  @IsEnum(MonthlyLedgerStatus)
  status?: MonthlyLedgerStatus;
}

export class MonthlyLedgerResponseDto {
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

export class MonthlyInvoiceDto {
  id: string;
  userId: string;
  vendorId: string;
  month: number;
  year: number;
  totalAmount: number;
  dueDate: Date;
  status: InvoiceStatus;
  pdfUrl?: string;
  ledgerEntries: MonthlyLedgerResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class MonthlyBillingSummaryDto {
  userId: string;
  vendorId: string;
  month: number;
  year: number;
  totalDeliveries: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  ledgerEntries: MonthlyLedgerResponseDto[];
}

export class GenerateInvoiceDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2020)
  year: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vendorIds?: string[];
}
