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
