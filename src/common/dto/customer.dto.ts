import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerRole } from '../interfaces/customer.interface';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer phone number',
    example: '+919876543210',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Customer role in the system',
    example: 'customer',
    enum: CustomerRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(CustomerRole)
  role?: CustomerRole;

  @ApiProperty({
    description: 'Initial wallet balance',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  walletBalance?: number;

  @ApiProperty({
    description: 'Whether the customer account is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Whether monthly payment mode is enabled',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  monthlyPaymentMode?: boolean;
}

export class UpdateCustomerDto {
  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Whether monthly payment mode is enabled',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  monthlyPaymentMode?: boolean;

  @ApiProperty({
    description: 'Whether the customer account is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Unique customer identifier',
    example: 'customer-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+919876543210',
  })
  phone: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Customer role in the system',
    example: 'customer',
    enum: CustomerRole,
  })
  role: CustomerRole;

  @ApiProperty({
    description: 'Current wallet balance in rupees',
    example: 150.5,
  })
  walletBalance: number;

  @ApiProperty({
    description: 'Whether the customer account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether monthly payment mode is enabled',
    example: false,
  })
  monthlyPaymentMode: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class CreateAddressDto {
  @ApiProperty({
    description: 'Address type',
    example: 'home',
    enum: ['home', 'office', 'other'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street, Apartment 4B',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: 'City name',
    example: 'Mumbai',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'State name',
    example: 'Maharashtra',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '400001',
  })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({
    description: 'Nearby landmark',
    example: 'Near Central Mall',
    required: false,
  })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 19.076,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AddressResponseDto {
  @ApiProperty({
    description: 'Unique address identifier',
    example: 'addr-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Address type',
    example: 'home',
    enum: ['home', 'office', 'other'],
  })
  type: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street, Apartment 4B',
  })
  street: string;

  @ApiProperty({
    description: 'City name',
    example: 'Mumbai',
  })
  city: string;

  @ApiProperty({
    description: 'State name',
    example: 'Maharashtra',
  })
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '400001',
  })
  pincode: string;

  @ApiProperty({
    description: 'Nearby landmark',
    example: 'Near Central Mall',
    required: false,
  })
  landmark?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 19.076,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
  })
  longitude: number;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: false,
  })
  isDefault: boolean;

  @ApiProperty({
    description: 'Address creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Address last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class SetDefaultAddressDto {
  @ApiProperty({
    description: 'Address ID to set as default',
    example: 'addr-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}

export class OrderHistoryDto {
  @ApiProperty({
    description: 'Unique order identifier',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Order number for reference',
    example: 'ORD-2024-001',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Order status',
    example: 'delivered',
    enum: [
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'delivered',
      'cancelled',
    ],
  })
  status: string;

  @ApiProperty({
    description: 'Subtotal amount',
    example: 450.0,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Delivery fee',
    example: 50.0,
  })
  deliveryFee: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 40.5,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Total amount',
    example: 540.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'cash',
    enum: ['cash', 'online', 'wallet'],
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'completed',
    enum: ['pending', 'completed', 'failed', 'refunded'],
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Order delivery timestamp',
    example: '2024-01-15T11:30:00Z',
    required: false,
  })
  deliveredAt?: Date;
}

export class OrderHistoryResponseDto {
  @ApiProperty({
    description: 'Array of orders',
    type: [OrderHistoryDto],
  })
  orders: OrderHistoryDto[];

  @ApiProperty({
    description: 'Total number of orders',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of orders per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class OrderDetailsDto {
  @ApiProperty({
    description: 'Unique order identifier',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderUuid: string;

  @ApiProperty({
    description: 'Order number for reference',
    example: 'ORD-2024-001',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Order status',
    example: 'delivered',
    enum: [
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'delivered',
      'cancelled',
    ],
  })
  status: string;

  @ApiProperty({
    description: 'Subtotal amount',
    example: 450.0,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Delivery fee',
    example: 50.0,
  })
  deliveryFee: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 40.5,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Total amount',
    example: 540.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'cash',
    enum: ['cash', 'online', 'wallet'],
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'completed',
    enum: ['pending', 'completed', 'failed', 'refunded'],
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Delivery instructions',
    example: 'Please ring the bell twice',
    required: false,
  })
  deliveryInstructions?: string;

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2024-01-15T14:00:00Z',
    required: false,
  })
  scheduledDelivery?: Date;

  @ApiProperty({
    description: 'Actual delivery time',
    example: '2024-01-15T14:15:00Z',
    required: false,
  })
  deliveredAt?: Date;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Order last update timestamp',
    example: '2024-01-15T14:15:00Z',
  })
  updatedAt: Date;
}

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Changed my mind',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RefundRequestDto {
  @ApiProperty({
    description: 'Reason for refund request',
    example: 'Product was damaged',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Additional description',
    example: 'The package arrived damaged and items were not usable',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SubscriptionDto {
  @ApiProperty({
    description: 'Unique subscription identifier',
    example: 'sub-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product identifier',
    example: 'prod-123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name at time of subscription',
    example: 'Fresh Milk 1L',
  })
  productName: string;

  @ApiProperty({
    description: 'Quantity per delivery',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Delivery frequency',
    example: 'daily',
    enum: ['daily', 'weekly', 'monthly'],
  })
  frequency: string;

  @ApiProperty({
    description: 'Subscription status',
    example: 'active',
    enum: ['active', 'paused', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-01-15T00:00:00Z',
    required: false,
  })
  startDate?: Date;

  @ApiProperty({
    description: 'Subscription end date',
    example: '2024-12-15T00:00:00Z',
    required: false,
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Next delivery date',
    example: '2024-01-16T09:00:00Z',
    required: false,
  })
  nextDeliveryDate?: Date;

  @ApiProperty({
    description: 'Subscription creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Product identifier to subscribe to',
    example: 'prod-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Quantity per delivery',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Delivery frequency',
    example: 'daily',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: string;

  @ApiProperty({
    description: 'Address ID for delivery',
    example: 'addr-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-01-16T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;
}

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: 'Quantity per delivery',
    example: 3,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({
    description: 'Delivery frequency',
    example: 'weekly',
    enum: ['daily', 'weekly', 'monthly'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency?: string;

  @ApiProperty({
    description: 'Address ID for delivery',
    example: 'addr-123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiProperty({
    description: 'Subscription status',
    example: 'paused',
    enum: ['active', 'paused', 'cancelled'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['active', 'paused', 'cancelled'])
  status?: string;
}

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Moving to a different location',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Preferred language',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Preferred currency',
    example: 'INR',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Email notification preferences',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({
    description: 'SMS notification preferences',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiProperty({
    description: 'Push notification preferences',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({
    description: 'Marketing emails preference',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (starting from 1)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

export class UpdateAddressDto {
  @ApiProperty({
    description: 'Address type',
    example: 'home',
    enum: ['home', 'office', 'other'],
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street, Apartment 4B',
    required: false,
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({
    description: 'City name',
    example: 'Mumbai',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'State name',
    example: 'Maharashtra',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Postal code',
    example: '400001',
    required: false,
  })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiProperty({
    description: 'Nearby landmark',
    example: 'Near Central Mall',
    required: false,
  })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 19.076,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
