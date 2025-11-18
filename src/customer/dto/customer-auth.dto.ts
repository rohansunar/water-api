import {
  IsString,
  IsPhoneNumber,
  Length,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerLoginDto {
  @ApiProperty({
    description: 'Indian phone number for customer authentication',
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

export class CustomerVerifyOtpDto {
  @ApiProperty({
    description: 'Indian phone number for customer authentication',
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
    example: '123456',
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

export class CustomerAuthResponseDto {
  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Customer profile information',
  })
  customer: any; // Will be defined based on CustomerProfileDto

  @ApiProperty({
    description: 'Success message',
    example: 'Authentication successful',
  })
  message: string;
}