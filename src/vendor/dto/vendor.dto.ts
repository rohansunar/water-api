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
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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


export class VendorLoginDto {
  @ApiProperty({
    description: 'Vendor phone number',
    example: '+91-9876543210',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Vendor password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class VendorProfileDto {
  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Business name',
    example: 'Fresh Water Solutions',
  })
  businessName: string;

  @ApiProperty({
    description: 'Vendor email',
    example: 'vendor@freshwater.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+91-9876543210',
  })
  phone: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Business Street, Mumbai, 400001',
  })
  address: string;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last account update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class VendorAuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Vendor profile information',
    type: VendorProfileDto,
  })
  vendor: VendorProfileDto;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

// Store DTOs
export class CreateStoreDto {
  @ApiProperty({
    description: 'Store name',
    example: 'Downtown Water Store',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Store address',
    example: '123 Main Street, Downtown, Mumbai, 400001',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Store phone number',
    example: '+91-9876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Store active hours in JSON format',
    example: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
  })
  @IsOptional()
  @IsObject()
  active_hours?: Record<string, { open: string; close: string }>;
}

export class UpdateStoreDto {
  @ApiProperty({
    description: 'Store name',
    example: 'Downtown Water Store',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Store address',
    example: '123 Main Street, Downtown, Mumbai, 400001',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Store phone number',
    example: '+91-9876543210',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Store active hours in JSON format',
    example: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  active_hours?: Record<string, { open: string; close: string }>;

  @ApiProperty({
    description: 'Store active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class StoreResponseDto {
  @ApiProperty({
    description: 'Store unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '456',
  })
  vendor_id: string;

  @ApiProperty({
    description: 'Store name',
    example: 'Downtown Water Store',
  })
  name: string;

  @ApiProperty({
    description: 'Store address',
    example: '123 Main Street, Downtown, Mumbai, 400001',
  })
  address: string;

  @ApiProperty({
    description: 'Store phone number',
    example: '+91-9876543210',
  })
  phone?: string;

  @ApiProperty({
    description: 'Store active hours in JSON format',
    example: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
  })
  active_hours?: Record<string, { open: string; close: string }>;

  @ApiProperty({
    description: 'Store active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Store creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Store last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

// Product DTOs
export class CreateVendorProductDto {
  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'PW-20L-001',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Product attributes in JSON format',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
  })
  @IsNotEmpty()
  base_price: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class UpdateVendorProductDto {
  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'PW-20L-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Product attributes in JSON format',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  base_price?: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    description: 'Product active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateVendorProductVariantDto {
  @ApiProperty({
    description: 'Variant SKU',
    example: 'PW-20L-MINERAL-001',
  })
  @IsString()
  @IsNotEmpty()
  variant_sku: string;

  @ApiProperty({
    description: 'Variant attributes that differ from base product',
    example: { type: 'mineral', brand: 'AquaPure' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Price override for this variant',
    example: 55.0,
  })
  @IsOptional()
  price_override?: number;
}

export class UpdateVendorProductVariantDto {
  @ApiProperty({
    description: 'Variant attributes that differ from base product',
    example: { type: 'mineral', brand: 'AquaPure' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Price override for this variant',
    example: 55.0,
    required: false,
  })
  @IsOptional()
  price_override?: number;

  @ApiProperty({
    description: 'Variant active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateVendorProductMappingDto {
  @ApiProperty({
    description: 'Store ID where product is available',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @ApiProperty({
    description: 'Product variant ID',
    example: '456',
  })
  @IsString()
  @IsNotEmpty()
  product_variant_id: string;

  @ApiProperty({
    description: 'Price for this store',
    example: 50.0,
  })
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Stock quantity available at this store',
    example: 100,
  })
  @IsOptional()
  stock?: number;

  @ApiProperty({
    description: 'Area pincodes where this mapping is applicable',
    example: ['110001', '110002', '110003'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  area_pincodes?: string[];
}

export class UpdateVendorProductMappingDto {
  @ApiProperty({
    description: 'Price for this store',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Stock quantity available at this store',
    example: 100,
    required: false,
  })
  @IsOptional()
  stock?: number;

  @ApiProperty({
    description: 'Area pincodes where this mapping is applicable',
    example: ['110001', '110002', '110003'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  area_pincodes?: string[];

  @ApiProperty({
    description: 'Mapping active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class VendorProductResponseDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '456',
  })
  vendor_id: string;

  @ApiProperty({
    description: 'Product title/name',
    example: 'Premium Mineral Water 20L',
  })
  title: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'PW-20L-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Premium quality mineral water in 20L container',
  })
  description?: string;

  @ApiProperty({
    description: 'Product category',
    example: 'water_jar',
  })
  category: string;

  @ApiProperty({
    description: 'Product attributes',
    example: { size: '20L', type: 'mineral', brand: 'AquaPure' },
  })
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Base price of the product',
    example: 50.0,
  })
  base_price: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'liter',
  })
  unit: string;

  @ApiProperty({
    description: 'Product active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Product creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Product last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

export class VendorProductVariantResponseDto {
  @ApiProperty({
    description: 'Product variant unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Product unique identifier',
    example: '456',
  })
  product_id: string;

  @ApiProperty({
    description: 'Variant SKU',
    example: 'PW-20L-MINERAL-001',
  })
  variant_sku: string;

  @ApiProperty({
    description: 'Variant attributes',
    example: { type: 'mineral', brand: 'AquaPure' },
  })
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Price override for this variant',
    example: 55.0,
  })
  price_override?: number;

  @ApiProperty({
    description: 'Variant active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Variant creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Variant last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

export class VendorProductMappingResponseDto {
  @ApiProperty({
    description: 'Product mapping unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Product unique identifier',
    example: '456',
  })
  product_id: string;

  @ApiProperty({
    description: 'Store unique identifier',
    example: '789',
  })
  store_id: string;

  @ApiProperty({
    description: 'Product variant unique identifier',
    example: '101',
  })
  product_variant_id: string;

  @ApiProperty({
    description: 'Price for this store',
    example: 50.0,
  })
  price?: number;

  @ApiProperty({
    description: 'Stock quantity available at this store',
    example: 100,
  })
  stock: number;

  @ApiProperty({
    description: 'Reserved stock quantity',
    example: 10,
  })
  reserved_stock: number;

  @ApiProperty({
    description: 'Area pincodes where this mapping is applicable',
    example: ['110001', '110002', '110003'],
  })
  area_pincodes: string[];

  @ApiProperty({
    description: 'Mapping active status',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Mapping creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Mapping last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}

// Store Hours DTOs
export class CreateStoreHoursDto {
  @ApiProperty({
    description: 'Day of the week',
    example: 'monday',
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  })
  @IsEnum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ])
  day: string;

  @ApiProperty({
    description: 'Opening time in HH:MM format',
    example: '09:00',
  })
  @IsString()
  openTime: string;

  @ApiProperty({
    description: 'Closing time in HH:MM format',
    example: '21:00',
  })
  @IsString()
  closeTime: string;

  @ApiProperty({
    description: 'Whether the store is closed on this day',
    example: false,
  })
  @IsBoolean()
  isClosed: boolean;
}

export class UpdateStoreHoursDto {
  @ApiProperty({
    description: 'Opening time in HH:MM format',
    example: '09:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiProperty({
    description: 'Closing time in HH:MM format',
    example: '21:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiProperty({
    description: 'Whether the store is closed on this day',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class StoreHoursResponseDto {
  @ApiProperty({
    description: 'Store hours unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Store unique identifier',
    example: '456',
  })
  storeId: string;

  @ApiProperty({
    description: 'Day of the week',
    example: 'monday',
  })
  day: string;

  @ApiProperty({
    description: 'Opening time in HH:MM format',
    example: '09:00',
  })
  openTime: string;

  @ApiProperty({
    description: 'Closing time in HH:MM format',
    example: '21:00',
  })
  closeTime: string;

  @ApiProperty({
    description: 'Whether the store is closed on this day',
    example: false,
  })
  isClosed: boolean;

  @ApiProperty({
    description: 'Store hours creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Store hours last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class UpdateStoreStatusDto {
  @ApiProperty({
    description: 'Store status',
    example: 'open',
    enum: ['open', 'closed', 'temporarily_closed'],
  })
  @IsEnum(['open', 'closed', 'temporarily_closed'])
  status: 'open' | 'closed' | 'temporarily_closed';

  @ApiProperty({
    description: 'Reason for status change (optional)',
    example: 'Maintenance work',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Product Variant DTOs
export class UpdateProductVariantDto {
  @ApiProperty({
    description: 'Variant attributes that differ from base product',
    example: { type: 'mineral', brand: 'AquaPure' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Price override for this variant',
    example: 55.0,
    required: false,
  })
  @IsOptional()
  priceOverride?: number;

  @ApiProperty({
    description: 'Variant active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductVariantResponseDto {
  @ApiProperty({
    description: 'Product variant unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Product unique identifier',
    example: '456',
  })
  productId: string;

  @ApiProperty({
    description: 'Variant SKU',
    example: 'PW-20L-MINERAL-001',
  })
  variantSku: string;

  @ApiProperty({
    description: 'Variant attributes',
    example: { type: 'mineral', brand: 'AquaPure' },
  })
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Price override for this variant',
    example: 55.0,
  })
  priceOverride?: number;

  @ApiProperty({
    description: 'Variant active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Variant creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Variant last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

// Analytics DTOs
export class SalesAnalyticsDto {
  @ApiProperty({
    description: 'Analytics period',
    example: 'daily',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiProperty({
    description: 'Start date for analytics (optional)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for analytics (optional)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class SalesAnalyticsResponseDto {
  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '123',
  })
  vendorId: string;

  @ApiProperty({
    description: 'Analytics period',
    example: 'monthly',
  })
  period: string;

  @ApiProperty({
    description: 'Total sales amount',
    example: 15000.0,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Total number of orders',
    example: 150,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Average order value',
    example: 100.0,
  })
  averageOrderValue: number;

  @ApiProperty({
    description: 'Sales data grouped by period',
    example: [
      { date: '2024-01-01', sales: 500, orders: 5 },
      { date: '2024-01-02', sales: 750, orders: 8 },
    ],
  })
  salesData: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;

  @ApiProperty({
    description: 'Top performing products',
    example: [
      {
        productId: 'prod-1',
        productName: '20L Water Jar',
        sales: 5000,
        orders: 50,
      },
      {
        productId: 'prod-2',
        productName: '10L Water Jar',
        sales: 3000,
        orders: 60,
      },
    ],
  })
  topProducts: Array<{
    productId: string;
    productName: string;
    sales: number;
    orders: number;
  }>;
}

export class ProductPerformanceDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: '20L Water Jar',
  })
  productName: string;

  @ApiProperty({
    description: 'Total sales amount for this product',
    example: 5000.0,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Total number of orders for this product',
    example: 50,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Average rating for this product',
    example: 4.5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Number of reviews for this product',
    example: 25,
  })
  reviewCount: number;

  @ApiProperty({
    description: 'Current stock level',
    example: 100,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Stock turnover rate',
    example: 2.5,
  })
  stockTurnoverRate: number;
}

export class CustomerInsightsDto {
  @ApiProperty({
    description: 'Customer unique identifier',
    example: '123',
  })
  customerId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  customerName: string;

  @ApiProperty({
    description: 'Total orders placed by this customer',
    example: 15,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Total amount spent by this customer',
    example: 1500.0,
  })
  totalSpent: number;

  @ApiProperty({
    description: 'Average order value for this customer',
    example: 100.0,
  })
  averageOrderValue: number;

  @ApiProperty({
    description: 'Date of first order',
    example: '2024-01-01T10:30:00Z',
  })
  firstOrderDate: Date;

  @ApiProperty({
    description: 'Date of last order',
    example: '2024-01-15T10:30:00Z',
  })
  lastOrderDate: Date;

  @ApiProperty({
    description: 'Customer loyalty score (0-100)',
    example: 85,
  })
  loyaltyScore: number;
}

export class DailyReportDto {
  @ApiProperty({
    description: 'Report date',
    example: '2024-01-15',
  })
  date: string;

  @ApiProperty({
    description: 'Total sales for the day',
    example: 5000.0,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Total orders for the day',
    example: 50,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Number of new customers',
    example: 5,
  })
  newCustomers: number;

  @ApiProperty({
    description: 'Top selling products for the day',
    example: [
      {
        productId: 'prod-1',
        productName: '20L Water Jar',
        quantity: 25,
        revenue: 2500,
      },
      {
        productId: 'prod-2',
        productName: '10L Water Jar',
        quantity: 15,
        revenue: 1500,
      },
    ],
  })
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;

  @ApiProperty({
    description: 'Order status breakdown',
    example: {
      pending: 5,
      confirmed: 20,
      in_transit: 15,
      delivered: 10,
      cancelled: 0,
    },
  })
  orderStatusBreakdown: Record<string, number>;
}

export class MonthlyReportDto {
  @ApiProperty({
    description: 'Report month',
    example: '2024-01',
  })
  month: string;

  @ApiProperty({
    description: 'Total sales for the month',
    example: 150000.0,
  })
  totalSales: number;

  @ApiProperty({
    description: 'Total orders for the month',
    example: 1500,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Average daily sales',
    example: 5000.0,
  })
  averageDailySales: number;

  @ApiProperty({
    description: 'Growth percentage compared to previous month',
    example: 15.5,
  })
  growthPercentage: number;

  @ApiProperty({
    description: 'Monthly sales data by day',
    example: [
      { day: 1, sales: 4500, orders: 45 },
      { day: 2, sales: 5200, orders: 52 },
    ],
  })
  dailyBreakdown: Array<{
    day: number;
    sales: number;
    orders: number;
  }>;
}

// Inventory DTOs
export class InventoryStatusDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: '20L Water Jar',
  })
  productName: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 100,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Reserved stock quantity',
    example: 10,
  })
  reservedStock: number;

  @ApiProperty({
    description: 'Available stock quantity',
    example: 90,
  })
  availableStock: number;

  @ApiProperty({
    description: 'Low stock threshold',
    example: 20,
  })
  lowStockThreshold: number;

  @ApiProperty({
    description: 'Whether stock is low',
    example: false,
  })
  isLowStock: boolean;

  @ApiProperty({
    description: 'Last stock update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastUpdated: Date;
}

export class UpdateInventoryDto {
  @ApiProperty({
    description: 'New stock quantity',
    example: 150,
  })
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Reason for inventory update',
    example: 'New stock received',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Reference number (optional)',
    example: 'PO-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class InventoryAdjustmentDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description:
      'Quantity to adjust (positive for addition, negative for reduction)',
    example: 50,
  })
  @IsNotEmpty()
  adjustmentQuantity: number;

  @ApiProperty({
    description: 'Type of adjustment',
    example: 'stock_in',
    enum: ['stock_in', 'stock_out', 'damage', 'expiry', 'correction'],
  })
  @IsEnum(['stock_in', 'stock_out', 'damage', 'expiry', 'correction'])
  adjustmentType: 'stock_in' | 'stock_out' | 'damage' | 'expiry' | 'correction';

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'New delivery received',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Reference number (optional)',
    example: 'ADJ-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class LowStockAlertDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: '20L Water Jar',
  })
  productName: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 15,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Low stock threshold',
    example: 20,
  })
  lowStockThreshold: number;

  @ApiProperty({
    description: 'Severity level of the alert',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({
    description: 'Date when stock went below threshold',
    example: '2024-01-15T10:30:00Z',
  })
  alertDate: Date;
}

// Order Management DTOs
export class OrderSummaryDto {
  @ApiProperty({
    description: 'Order unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Customer unique identifier',
    example: '456',
  })
  customerId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  customerName: string;

  @ApiProperty({
    description: 'Order status',
    example: 'pending',
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'in_transit',
      'delivered',
      'cancelled',
    ],
  })
  status: string;

  @ApiProperty({
    description: 'Total order amount',
    example: 150.0,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Delivery address',
    example: '123 Customer Street, Delhi, 110001',
  })
  deliveryAddress: string;

  @ApiProperty({
    description: 'Customer contact phone',
    example: '+91-9876543210',
  })
  contactPhone: string;
}

export class AcceptOrderDto {
  @ApiProperty({
    description: 'Estimated preparation time in minutes',
    example: 30,
  })
  @IsOptional()
  estimatedPreparationTime?: number;

  @ApiProperty({
    description: 'Special instructions for the order',
    example: 'Handle with care',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class RejectOrderDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Out of stock',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Alternative suggestion (optional)',
    example: 'Try ordering tomorrow',
    required: false,
  })
  @IsOptional()
  @IsString()
  alternativeSuggestion?: string;
}

// Pagination DTOs
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Data items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}
