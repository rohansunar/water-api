import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsPhoneNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderSchedule, PaymentMethod } from '../../order/interfaces/order.interface';
import {
  IsValidUUID,
  IsValidQuantity,
  IsValidAmount,
  IsValidPincode,
  IsValidLatitude,
  IsValidLongitude,
} from '../../common/decorators/validation.decorators';

export class DeliveryAddressDto {
  @IsString({ message: 'Street address must be a string' })
  @IsNotEmpty({ message: 'Street address is required' })
  @Transform(({ value }) => value?.toString().trim())
  street: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @Transform(({ value }) => value?.toString().trim())
  city: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @Transform(({ value }) => value?.toString().trim())
  state: string;

  @IsString({ message: 'Pincode must be a string' })
  @IsNotEmpty({ message: 'Pincode is required' })
  @IsValidPincode({ message: 'Please provide a valid 6-digit pincode' })
  @Transform(({ value }) => value?.toString().trim())
  pincode: string;

  @IsOptional()
  @IsString({ message: 'Landmark must be a string' })
  @Transform(({ value }) => value?.toString().trim())
  landmark?: string;

  @IsNumber({}, { message: 'Latitude must be a number' })
  @IsValidLatitude({ message: 'Please provide a valid latitude' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a number' })
  @IsValidLongitude({ message: 'Please provide a valid longitude' })
  longitude: number;

  @IsString({ message: 'Contact phone must be a string' })
  @IsNotEmpty({ message: 'Contact phone is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  contactPhone: string;
}

export class CreateOrderDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(OrderSchedule)
  schedule: OrderSchedule;

  @IsOptional()
  @IsDateString()
  delivery_time?: string;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  delivery_address?: DeliveryAddressDto;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    example: 'in_transit',
    enum: ['picked', 'in_transit', 'delivered'],
  })
  @IsEnum(['picked', 'in_transit', 'delivered'])
  status: string;

  @ApiProperty({
    description: 'Optional notes about the status update',
    example: 'Package picked up from vendor',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderResponseDto {
  @ApiProperty({
    description: 'Unique order identifier',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Customer user ID',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Vendor ID',
    example: 'vendor-123e4567-e89b-12d3-a456-426614174000',
  })
  vendorId: string;

  @ApiProperty({
    description: 'Product ID',
    example: 'product-123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Total order amount in rupees',
    example: 150.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Current order status',
    example: 'confirmed',
    enum: [
      'pending',
      'confirmed',
      'picked',
      'in_transit',
      'delivered',
      'cancelled',
    ],
  })
  status: string;

  @ApiProperty({
    description: 'Delivery schedule type',
    example: 'immediate',
    enum: ['immediate', 'scheduled'],
  })
  schedule: string;

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2024-01-15T14:30:00Z',
    required: false,
  })
  deliveryTime?: Date;

  @ApiProperty({
    description: 'Payment method',
    example: 'wallet',
    enum: ['wallet', 'cash', 'card'],
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'paid',
    enum: ['pending', 'paid', 'failed'],
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Delivery address details',
  })
  deliveryAddress: DeliveryAddressDto;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
