import {
  IsString,
  IsPhoneNumber,
  Length,
  IsOptional,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Indian phone number for authentication',
    example: '+919876543210',
    pattern: '^\\+91[6-9]\\d{9}$',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Indian phone number for authentication',
    example: '+919876543210',
    pattern: '^\\+91[6-9]\\d{9}$',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  phone: string;

  @ApiProperty({
    description: 'One-time password received via SMS',
    example: '1234',
    minLength: 4,
    maxLength: 6,
    pattern: '^\\d{4,6}$',
  })
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(4, 6, { message: 'OTP must be between 4 and 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  @Transform(({ value }) => value?.toString().trim())
  otp: string;
}

export class AddressDto {
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
    example: true,
  })
  isDefault: boolean;
}

export class CustomerProfileDto {
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
    enum: ['customer', 'vendor', 'rider', 'admin'],
  })
  role: string;

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
    description: 'Customer delivery addresses',
    type: [AddressDto],
  })
  addresses: AddressDto[];

  @ApiProperty({
    description: 'Number of addresses associated with the customer',
    example: 2,
    required: false,
  })
  @IsOptional()
  addressCount?: number;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

// Legacy DTO for backward compatibility during migration
export class UserProfileDto extends CustomerProfileDto {}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Customer profile information',
  })
  customer: CustomerProfileDto;

  // Legacy property for backward compatibility during migration
  @ApiProperty({
    description: 'User profile information (deprecated, use customer instead)',
  })
  user: UserProfileDto;
}
