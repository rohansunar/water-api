import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class LocationUpdateDto {
  @ApiProperty({
    description: 'Latitude coordinate of the rider location',
    example: 19.076,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate of the rider location',
    example: 72.8777,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;
}

export class UpdateAvailabilityDto {
  @ApiProperty({
    description: 'Whether the rider is available for deliveries',
    example: true,
  })
  @IsBoolean({ message: 'isAvailable must be a boolean' })
  isAvailable: boolean;
}

export class DeliveryRiderResponseDto {
  @ApiProperty({
    description: 'Unique rider identifier',
    example: 'rider-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Associated user ID',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Rider full name',
    example: 'Rajesh Kumar',
  })
  name: string;

  @ApiProperty({
    description: 'Rider phone number',
    example: '+919876543210',
  })
  phone: string;

  @ApiProperty({
    description: 'Type of vehicle used for delivery',
    example: 'motorcycle',
    enum: ['motorcycle', 'bicycle', 'scooter', 'car'],
  })
  vehicleType: string;

  @ApiProperty({
    description: 'Vehicle registration number',
    example: 'MH01AB1234',
  })
  vehicleNumber: string;

  @ApiProperty({
    description: 'Whether the rider account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the rider is currently available for deliveries',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Current location of the rider',
    required: false,
    example: {
      latitude: 19.076,
      longitude: 72.8777,
      updatedAt: '2024-01-15T10:30:00Z',
    },
  })
  @IsOptional()
  currentLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };

  @ApiProperty({
    description: 'Average rating from customers',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Total number of completed deliveries',
    example: 150,
  })
  totalDeliveries: number;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class LocationUpdateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Location updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated location information',
    example: {
      latitude: 19.076,
      longitude: 72.8777,
      updatedAt: '2024-01-15T10:30:00Z',
    },
  })
  location: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}
