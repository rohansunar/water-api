import {
  IsString,
  IsPhoneNumber,
  Length,
  IsNotEmpty,
  Matches,
  IsBoolean,
  IsNumber,
  IsOptional,
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

export class CustomerSendOtpDto {
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

export class CustomerOtpResponseDto {
  @ApiProperty({
    description: 'Whether the OTP request was successful',
    example: true,
  })
  @IsBoolean({ message: 'Success must be a boolean' })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'OTP sent successfully',
  })
  @IsString({ message: 'Message must be a string' })
  message: string;

  @ApiProperty({
    description: 'OTP expiration time in seconds',
    example: 300,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Expires in must be a number' })
  expiresIn?: number;
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
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  @IsNumber({}, { message: 'Expires in must be a number' })
  expiresIn: number;
}
