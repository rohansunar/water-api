import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  DisputeStatus,
  DisputePriority,
  DisputeCategory,
} from '../interfaces/dispute.interface';

export class DisputeEvidenceDto {
  @ApiProperty({
    description: 'Image URLs',
    example: ['https://example.com/image1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Document URLs',
    example: ['https://example.com/document.pdf'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({
    description: 'Additional information',
    example: { deliveryTime: '6:00 PM', expectedTime: '2:00 PM' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}

export class CreateDisputeDto {
  @ApiProperty({
    description: 'Order UUID to create dispute for',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Dispute reason',
    example: 'Product delivered late',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Detailed description of the dispute',
    example:
      'The product was supposed to be delivered by 2 PM but arrived at 6 PM',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Dispute category',
    example: 'delivery_delay',
    enum: DisputeCategory,
  })
  @IsEnum(DisputeCategory)
  category: DisputeCategory;

  @ApiProperty({
    description: 'Dispute priority',
    example: 'medium',
    enum: DisputePriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority = DisputePriority.MEDIUM;

  @ApiProperty({
    description: 'Evidence attachments',
    required: false,
  })
  @IsOptional()
  @IsObject()
  evidence?: DisputeEvidenceDto;
}

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Resolution description',
    example: 'Refund issued for delivery delay',
  })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiProperty({
    description: 'Resolution notes',
    example: 'Customer satisfied with resolution',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDisputeStatusDto {
  @ApiProperty({
    description: 'New dispute status',
    example: 'investigating',
    enum: DisputeStatus,
  })
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @ApiProperty({
    description: 'Status update notes',
    example: 'Started investigation with vendor',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DisputeMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Please provide delivery proof',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Attachment URLs',
    example: ['https://example.com/proof.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class DisputeResponseDto {
  @ApiProperty({
    description: 'Dispute ID',
    example: 1,
  })
  id: bigint;

  @ApiProperty({
    description: 'Order ID',
    example: 123,
  })
  orderId: bigint;

  @ApiProperty({
    description: 'Raised by user ID',
    example: 456,
  })
  raisedBy: bigint;

  @ApiProperty({
    description: 'Raised by user type',
    example: 'customer',
    enum: ['customer', 'vendor'],
  })
  raisedByType: 'customer' | 'vendor';

  @ApiProperty({
    description: 'Dispute reason',
    example: 'Product delivered late',
  })
  reason: string;

  @ApiProperty({
    description: 'Dispute description',
    example:
      'The product was supposed to be delivered by 2 PM but arrived at 6 PM',
  })
  description: string;

  @ApiProperty({
    description: 'Dispute status',
    example: 'open',
    enum: DisputeStatus,
  })
  status: DisputeStatus;

  @ApiProperty({
    description: 'Dispute priority',
    example: 'medium',
    enum: DisputePriority,
  })
  priority: DisputePriority;

  @ApiProperty({
    description: 'Dispute category',
    example: 'delivery_delay',
    enum: DisputeCategory,
  })
  category: DisputeCategory;

  @ApiProperty({
    description: 'Evidence attachments',
    required: false,
  })
  evidence?: DisputeEvidenceDto;

  @ApiProperty({
    description: 'Resolution description',
    example: 'Refund issued for delivery delay',
    required: false,
  })
  resolution?: string;

  @ApiProperty({
    description: 'Resolved by admin ID',
    example: 1,
    required: false,
  })
  resolvedBy?: bigint;

  @ApiProperty({
    description: 'Resolved timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  resolvedAt?: Date;

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

export class DisputeListQueryDto {
  @ApiProperty({
    description: 'Filter by status',
    enum: DisputeStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiProperty({
    description: 'Filter by priority',
    enum: DisputePriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @ApiProperty({
    description: 'Filter by category',
    enum: DisputeCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputeCategory)
  category?: DisputeCategory;

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
