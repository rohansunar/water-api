import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaginationQueryDto,
  PaginationMetaDto,
  PaginatedResponseDto,
} from '../../common/utils/pagination.util';
import { UserRole } from '../../common/interfaces/user.interface';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@platform.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AdminProfileDto {
  @ApiProperty({
    description: 'Admin unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@platform.com',
  })
  email: string;

  @ApiProperty({
    description: 'Admin name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Admin role level',
    example: 'super_admin',
    enum: ['super_admin', 'finance_admin', 'support_admin'],
  })
  roleLevel: string;

  @ApiProperty({
    description: 'Admin permissions',
    example: { canManageUsers: true, canViewReports: true },
  })
  permissions?: Record<string, any>;

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

export class AdminAuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Admin profile information',
    type: AdminProfileDto,
  })
  admin: AdminProfileDto;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

// Pagination DTOs for Admin Endpoints
export class AdminPaginationQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by user role',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'Filter by user status',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiProperty({
    description: 'Search by name or email',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminUserListResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User phone number',
    example: '9999999999',
  })
  phone: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CUSTOMER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Monthly payment mode enabled',
    example: false,
  })
  monthlyPaymentMode: boolean;

  @ApiProperty({
    description: 'Wallet balance',
    example: 500.0,
  })
  walletBalance: number;

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

export class AdminOrderListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by order status',
    example: 'pending',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filter by customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    description: 'Filter by vendor ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiProperty({
    description: 'Filter by rider ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsOptional()
  @IsString()
  riderId?: string;

  @ApiProperty({
    description: 'Filter by date from (ISO string)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by date to (ISO string)',
    example: '2024-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class AdminTransactionListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by transaction type',
    example: 'payment',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Filter by amount range - min',
    example: 100.0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMin?: number;

  @ApiProperty({
    description: 'Filter by amount range - max',
    example: 1000.0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMax?: number;

  @ApiProperty({
    description: 'Filter by date from (ISO string)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by date to (ISO string)',
    example: '2024-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class AdminComplaintListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by complaint status',
    example: 'open',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filter by complaint type',
    example: 'delivery_delay',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Filter by priority level',
    example: 'high',
    required: false,
  })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class AdminProductListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by moderation status',
    example: 'pending',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filter by vendor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiProperty({
    description: 'Filter by category',
    example: 'water_bottles',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Filter by flagged products only',
    example: true,
    required: false,
  })
  @IsOptional()
  flagged?: boolean;
}

export class AdminPaginatedResponseDto<T> extends PaginatedResponseDto<T> {}

export class CreateAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@platform.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Admin phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Admin name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Admin role level',
    example: 'support',
    enum: ['super_admin', 'finance_admin', 'support_admin'],
    default: 'support',
  })
  @IsString()
  @IsNotEmpty()
  roleLevel: string;

  @ApiProperty({
    description: 'Admin permissions',
    example: { canManageUsers: true, canViewReports: true },
    required: false,
  })
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiProperty({
    description: 'Admin password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class UpdateAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@platform.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Admin phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Admin name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Admin role level',
    example: 'support',
    enum: ['super_admin', 'finance_admin', 'support_admin'],
    required: false,
  })
  @IsOptional()
  @IsString()
  roleLevel?: string;

  @ApiProperty({
    description: 'Admin permissions',
    example: { canManageUsers: true, canViewReports: true },
    required: false,
  })
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminResponseDto {
  @ApiProperty({
    description: 'Admin unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@platform.com',
  })
  email: string;

  @ApiProperty({
    description: 'Admin phone number',
    example: '9999999999',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Admin name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Admin role level',
    example: 'super_admin',
    enum: ['super_admin', 'finance_admin', 'support_admin'],
  })
  roleLevel: string;

  @ApiProperty({
    description: 'Admin permissions',
    example: { canManageUsers: true, canViewReports: true },
  })
  permissions?: Record<string, any>;

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

  @ApiProperty({
    description: 'Last active timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  lastActiveAt?: Date;
}

export class CreateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'Fresh Water Solutions',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Vendor phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Vendor email address',
    example: 'vendor@freshwater.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'GST Identification Number',
    example: '22AAAAA0000A1Z5',
    required: false,
  })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiProperty({
    description: 'Bank account ID',
    example: 12345,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bankAccountId?: number;

  @ApiProperty({
    description: 'Additional metadata',
    example: { businessType: 'retail', establishedYear: 2020 },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'Fresh Water Solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Vendor phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Vendor email address',
    example: 'vendor@freshwater.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'GST Identification Number',
    example: '22AAAAA0000A1Z5',
    required: false,
  })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiProperty({
    description: 'Bank account ID',
    example: 12345,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bankAccountId?: number;

  @ApiProperty({
    description: 'KYC status',
    example: 'approved',
    required: false,
  })
  @IsOptional()
  @IsString()
  kycStatus?: string;

  @ApiProperty({
    description: 'Verification status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Additional metadata',
    example: { businessType: 'retail', establishedYear: 2020 },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VendorResponseDto {
  @ApiProperty({
    description: 'Vendor unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor phone number',
    example: '9999999999',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Vendor email',
    example: 'vendor@freshwater.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'Fresh Water Solutions',
  })
  name: string;

  @ApiProperty({
    description: 'KYC status',
    example: 'pending',
  })
  kycStatus: string;

  @ApiProperty({
    description: 'GST Identification Number',
    example: '22AAAAA0000A1Z5',
    required: false,
  })
  gstin?: string;

  @ApiProperty({
    description: 'Bank account ID',
    example: 12345,
    required: false,
  })
  bankAccountId?: number;

  @ApiProperty({
    description: 'Vendor rating',
    example: 4.5,
    required: false,
  })
  rating?: number;

  @ApiProperty({
    description: 'Verification status',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Additional metadata',
    example: { businessType: 'retail', establishedYear: 2020 },
    required: false,
  })
  metadata?: Record<string, any>;

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

  @ApiProperty({
    description: 'Last active timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  lastActiveAt?: Date;
}

export class CreateRiderDto {
  @ApiProperty({
    description: 'Rider name',
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Rider phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Rider email address',
    example: 'rider@delivery.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'License number',
    example: 'DL123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiProperty({
    description: 'Vehicle type',
    example: 'motorcycle',
    required: false,
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiProperty({
    description: 'Shift schedule',
    example: {
      startTime: '09:00',
      endTime: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
    required: false,
  })
  @IsOptional()
  shift?: Record<string, any>;

  @ApiProperty({
    description: 'Additional metadata',
    example: { experience: '2 years', preferredAreas: ['downtown', 'uptown'] },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRiderDto {
  @ApiProperty({
    description: 'Rider name',
    example: 'John Smith',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Rider phone number',
    example: '9999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Rider email address',
    example: 'rider@delivery.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'License number',
    example: 'DL123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiProperty({
    description: 'Vehicle type',
    example: 'motorcycle',
    required: false,
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiProperty({
    description: 'Shift schedule',
    example: {
      startTime: '09:00',
      endTime: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday','saturday'],
    },
    required: false,
  })
  @IsOptional()
  shift?: Record<string, any>;

  @ApiProperty({
    description: 'Rider status',
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Account active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Additional metadata',
    example: { experience: '2 years', preferredAreas: ['downtown', 'uptown'] },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RiderResponseDto {
  @ApiProperty({
    description: 'Rider unique identifier',
    example: '123',
  })
  id: string;

  @ApiProperty({
    description: 'Rider UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'Rider phone number',
    example: '9999999999',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Rider email',
    example: 'rider@delivery.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Rider name',
    example: 'John Smith',
  })
  name: string;

  @ApiProperty({
    description: 'License number',
    example: 'DL123456789',
    required: false,
  })
  licenseNo?: string;

  @ApiProperty({
    description: 'Vehicle type',
    example: 'motorcycle',
    required: false,
  })
  vehicleType?: string;

  @ApiProperty({
    description: 'Shift schedule',
    example: {
      startTime: '09:00',
      endTime: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    required: false,
  })
  shift?: Record<string, any>;

  @ApiProperty({
    description: 'Rider status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Rider rating',
    example: 4.5,
    required: false,
  })
  rating?: number;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Additional metadata',
    example: { experience: '2 years', preferredAreas: ['downtown', 'uptown'] },
    required: false,
  })
  metadata?: Record<string, any>;

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

  @ApiProperty({
    description: 'Last active timestamp',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  lastActiveAt?: Date;
}
