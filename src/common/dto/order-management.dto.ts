import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../order/interfaces/order.interface';
import { PaginationQueryDto } from '../utils/pagination.util';

export class AdminUpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    example: 'cancelled',
    enum: OrderStatus,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Order cancelled by admin due to vendor unavailability',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Customer notified via email',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Whether to process refund automatically',
    example: true,
    required: false,
  })
  @IsOptional()
  processRefund?: boolean;
}

export class AdminOrderQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by order status',
    enum: OrderStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: 'Filter by customer UUID',
    example: 'customer-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({
    description: 'Filter by vendor UUID',
    example: 'vendor-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  vendorId?: string;


  @ApiProperty({
    description: 'Search term (order number, customer name, etc.)',
    example: 'ORD-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminOrderResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: 123,
  })
  id: bigint;

  @ApiProperty({
    description: 'Order UUID',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  orderUuid: string;

  @ApiProperty({
    description: 'Order number',
    example: 'ORD-001-2024',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 456,
  })
  customerId: bigint;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  customerName: string;

  @ApiProperty({
    description: 'Vendor ID',
    example: 789,
  })
  vendorId?: bigint;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Fresh Water Co.',
  })
  vendorName?: string;

  @ApiProperty({
    description: 'Order status',
    example: 'delivered',
    enum: OrderStatus,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Total amount',
    example: 150.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Payment status',
    example: 'completed',
  })
  paymentStatus: string;


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
