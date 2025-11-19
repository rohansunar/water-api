import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'The unique ID of the payment',
    example: 'payment-123',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the associated order',
    example: 'order-123',
  })
  orderId: string;

  @ApiProperty({
    description: 'The ID of the vendor',
    example: 'vendor-456',
  })
  vendorId: string;

  @ApiProperty({
    description: 'The payment amount',
    example: 150.0,
  })
  amount: number;

  @ApiProperty({
    description: 'The payment status',
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'The payment method used',
    example: 'wallet',
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'The payment gateway',
    example: 'stripe',
  })
  gateway: string;

  @ApiProperty({
    description: 'The transaction ID',
    example: 'txn_123456789',
    required: false,
  })
  transactionId?: string;

  @ApiProperty({
    description: 'The creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
