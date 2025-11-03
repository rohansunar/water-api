import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus } from '../../refund/interfaces/refund.interface';
import { Type } from 'class-transformer';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Order UUID to create refund for',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Refund amount',
    example: 150.5,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Reason for refund',
    example: 'Product delivered late',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Customer complained about delivery delay',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRefundDto {
  @ApiProperty({
    description: 'Approval notes',
    example: 'Approved after verifying delivery delay',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectRefundDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Delivery was within acceptable time frame',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Evidence shows delivery was on time',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessRefundDto {
  @ApiProperty({
    description: 'Refund method',
    example: 'wallet',
    enum: ['wallet', 'bank_transfer', 'upi'],
  })
  @IsString()
  @IsNotEmpty()
  refundMethod: string;

  @ApiProperty({
    description: 'Transaction ID from payment gateway',
    example: 'TXN_123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Processing notes',
    example: 'Refund processed successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundResponseDto {
  @ApiProperty({
    description: 'Refund ID',
    example: 1,
  })
  id: bigint;

  @ApiProperty({
    description: 'Order ID',
    example: 123,
  })
  orderId: bigint;

  @ApiProperty({
    description: 'Refund amount',
    example: 150.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Refund reason',
    example: 'Product delivered late',
  })
  reason: string;

  @ApiProperty({
    description: 'Refund status',
    example: 'pending',
    enum: RefundStatus,
  })
  status: RefundStatus;

  @ApiProperty({
    description: 'Refund method',
    example: 'wallet',
    required: false,
  })
  refundMethod?: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: 'TXN_123456789',
    required: false,
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Processed by admin ID',
    example: 1,
    required: false,
  })
  processedBy?: bigint;

  @ApiProperty({
    description: 'Processed timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  processedAt?: Date;

  @ApiProperty({
    description: 'Approved by admin ID',
    example: 1,
    required: false,
  })
  approvedBy?: bigint;

  @ApiProperty({
    description: 'Approved timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  approvedAt?: Date;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Customer complained about delivery delay',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class RefundListQueryDto {
  @ApiProperty({
    description: 'Filter by status',
    enum: RefundStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiProperty({
    description: 'Filter by order ID',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
