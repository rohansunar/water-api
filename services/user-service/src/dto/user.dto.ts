import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, ValidateNested, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../interfaces/user.interface';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsNumber()
  @IsOptional()
  @Min(0)
  walletBalance?: number;

  @IsBoolean()
  @IsOptional()
  monthlyPaymentMode?: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  monthlyPaymentMode?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  pincode: string;

  @IsString()
  @IsOptional()
  landmark?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  line1?: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  landmark?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UserProfileDto {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  walletBalance: number;
  isActive: boolean;
  monthlyPaymentMode: boolean;
  addresses: Array<{
    id: string;
    type: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }>;
  createdAt: Date;
}

export class UpdateWalletBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
