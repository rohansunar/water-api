import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VendorDocumentsDto {
  @IsOptional()
  @IsString()
  kycDoc?: string;

  @IsOptional()
  @IsString()
  businessLicense?: string;

  @IsOptional()
  @IsString()
  gstCertificate?: string;

  @IsOptional()
  @IsString()
  addressProof?: string;
}

export class BankAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  ifscCode: string;

  @IsString()
  bankName: string;

  @IsString()
  accountHolderName: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class RegisterVendorDto {
  @IsString()
  businessName: string;

  @IsString()
  businessAddress: string;

  @IsOptional()
  @IsPhoneNumber('IN')
  businessPhone?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VendorDocumentsDto)
  documents?: VendorDocumentsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsPhoneNumber('IN')
  businessPhone?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VendorDocumentsDto)
  documents?: VendorDocumentsDto;
}

export class VendorResponseDto {
  id: string;
  userId: string;
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  gstNumber?: string;
  licenseNumber?: string;
  documents?: VendorDocumentsDto;
  approvalStatus: string;
  rejectionReason?: string;
  bankAccounts: BankAccountResponseDto[];
  deliveryZones: DeliveryZoneDto[];
  isActive: boolean;
  rating: number;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BankAccountResponseDto {
  id: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
  upiId?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DeliveryZoneDto {
  id: string;
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  deliveryFee: number;
  minOrderAmount: number;
  maxDeliveryTime: number;
  isActive: boolean;
}

export class AddBankAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  ifscCode: string;

  @IsString()
  bankName: string;

  @IsString()
  accountHolderName: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class VendorApprovalDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
