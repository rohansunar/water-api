import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

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