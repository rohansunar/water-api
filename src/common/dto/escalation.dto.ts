import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DisputePriority } from '../interfaces/dispute.interface';
import { EscalationStatus } from '../interfaces/escalation.interface';

export class CreateEscalationDto {
  @ApiProperty({
    description: 'Dispute UUID to escalate',
    example: 'dispute-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({
    description: 'Escalation reason',
    example: 'Vendor not responding to dispute resolution',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Escalate to role level',
    example: 'senior_admin',
    enum: ['senior_admin', 'finance', 'management'],
  })
  @IsString()
  @IsNotEmpty()
  escalatedTo: string;

  @ApiProperty({
    description: 'Escalation priority',
    example: 'high',
    enum: DisputePriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority = DisputePriority.HIGH;
}

export class ResolveEscalationDto {
  @ApiProperty({
    description: 'Resolution description',
    example: 'Issue resolved with vendor compensation',
  })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiProperty({
    description: 'Resolution notes',
    example: 'Vendor agreed to provide compensation',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEscalationStatusDto {
  @ApiProperty({
    description: 'New escalation status',
    example: 'in_review',
    enum: EscalationStatus,
  })
  @IsEnum(EscalationStatus)
  status: EscalationStatus;

  @ApiProperty({
    description: 'Status update notes',
    example: 'Assigned to senior admin for review',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EscalationResponseDto {
  @ApiProperty({
    description: 'Escalation ID',
    example: 1,
  })
  id: bigint;

  @ApiProperty({
    description: 'Dispute ID',
    example: 123,
  })
  disputeId: bigint;

  @ApiProperty({
    description: 'Escalated by admin ID',
    example: 456,
  })
  escalatedBy: bigint;

  @ApiProperty({
    description: 'Escalated to role level',
    example: 'senior_admin',
  })
  escalatedTo: string;

  @ApiProperty({
    description: 'Escalation reason',
    example: 'Vendor not responding to dispute resolution',
  })
  reason: string;

  @ApiProperty({
    description: 'Escalation priority',
    example: 'high',
    enum: DisputePriority,
  })
  priority: DisputePriority;

  @ApiProperty({
    description: 'Escalation status',
    example: 'pending',
    enum: EscalationStatus,
  })
  status: EscalationStatus;

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
    description: 'Resolution description',
    example: 'Issue resolved with vendor compensation',
    required: false,
  })
  resolution?: string;

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

export class EscalationListQueryDto {
  @ApiProperty({
    description: 'Filter by status',
    enum: EscalationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(EscalationStatus)
  status?: EscalationStatus;

  @ApiProperty({
    description: 'Filter by priority',
    enum: DisputePriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @ApiProperty({
    description: 'Filter by escalated to role',
    example: 'senior_admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  escalatedTo?: string;

  @ApiProperty({
    description: 'Filter by dispute ID',
    example: 'dispute-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  disputeId?: string;

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
