import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ArrayNotEmpty,
} from 'class-validator';
import { ProductModerationStatus } from '@prisma/client';

export class ProductModerationDto {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  category: string;
  subcategory?: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  moderationStatus: ProductModerationStatus;
  flaggedReason?: string;
  autoFlagged: boolean;
  complianceIssues?: any[];
  createdAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
}

export class ApproveProductDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectProductDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkModerationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  reason?: string; // Required if action is 'reject'

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProductModerationStatsDto {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalFlagged: number;
  pendingToday: number;
  approvedToday: number;
  rejectedToday: number;
}

export class ProductModerationListQueryDto {
  @IsOptional()
  @IsEnum(ProductModerationStatus)
  status?: ProductModerationStatus;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
