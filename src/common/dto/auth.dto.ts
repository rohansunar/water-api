import {
  IsString,
  IsPhoneNumber,
  Length,
  IsOptional,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  phone: string;
}

export class VerifyOtpDto {
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('IN', {
    message: 'Please provide a valid Indian phone number',
  })
  @Transform(({ value }) => value?.toString().trim())
  phone: string;

  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(4, 6, { message: 'OTP must be between 4 and 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  @Transform(({ value }) => value?.toString().trim())
  otp: string;
}

export class AuthResponseDto {
  token: string;
  user: UserProfileDto;
}

export class UserProfileDto {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: string;
  walletBalance: number;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  addresses: AddressDto[];
  createdAt: Date;
}

export class AddressDto {
  id: string;
  type: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}
