import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsString,
  IsDateString,
  IsEnum,
  IsUUID,
  IsArray,
  IsPositive,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

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

// ===== EARNINGS MANAGEMENT DTOs =====

export class EarningsHistoryDto {
  @ApiProperty({
    description: 'Unique earning record identifier',
    example: 'earning-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Order ID associated with this earning',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Amount earned from this delivery',
    example: 50.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Type of earning',
    example: 'delivery_fee',
    enum: ['delivery_fee', 'tips', 'bonus', 'incentive'],
  })
  type: string;

  @ApiProperty({
    description: 'Status of the earning',
    example: 'completed',
    enum: ['pending', 'completed', 'withdrawn'],
  })
  status: string;

  @ApiProperty({
    description: 'Date when the earning was recorded',
    example: '2024-01-15T10:30:00Z',
  })
  earnedAt: Date;

  @ApiProperty({
    description: 'Additional details about the earning',
    example: 'Delivery completed successfully',
    required: false,
  })
  @IsOptional()
  description?: string;
}

export class EarningsSummaryDto {
  @ApiProperty({
    description: 'Total earnings for the period',
    example: 1250.5,
  })
  totalEarnings: number;

  @ApiProperty({
    description: 'Total number of deliveries completed',
    example: 25,
  })
  totalDeliveries: number;

  @ApiProperty({
    description: 'Average earnings per delivery',
    example: 50.0,
  })
  averagePerDelivery: number;

  @ApiProperty({
    description: 'Total tips received',
    example: 150.0,
  })
  totalTips: number;

  @ApiProperty({
    description: 'Total bonuses earned',
    example: 100.0,
  })
  totalBonuses: number;

  @ApiProperty({
    description: 'Current pending withdrawal amount',
    example: 800.0,
  })
  pendingWithdrawal: number;

  @ApiProperty({
    description: 'Date range for this summary',
    example: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    },
  })
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export class WithdrawalRequestDto {
  @ApiProperty({
    description: 'Amount to withdraw',
    example: 500.0,
    minimum: 100,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(100, { message: 'Minimum withdrawal amount is 100' })
  amount: number;

  @ApiProperty({
    description: 'Bank account number for withdrawal',
    example: '123456789012',
  })
  @IsString({ message: 'Bank account must be a string' })
  bankAccountNumber: string;

  @ApiProperty({
    description: 'Bank IFSC code',
    example: 'HDFC0001234',
  })
  @IsString({ message: 'IFSC code must be a string' })
  ifscCode: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Rajesh Kumar',
  })
  @IsString({ message: 'Account holder name must be a string' })
  accountHolderName: string;
}

export class WithdrawalHistoryDto {
  @ApiProperty({
    description: 'Unique withdrawal record identifier',
    example: 'withdrawal-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Amount withdrawn',
    example: 500.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Status of the withdrawal',
    example: 'completed',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Bank account number (masked)',
    example: '****56789012',
  })
  bankAccountNumber: string;

  @ApiProperty({
    description: 'Bank IFSC code',
    example: 'HDFC0001234',
  })
  ifscCode: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Rajesh Kumar',
  })
  accountHolderName: string;

  @ApiProperty({
    description: 'Transaction reference number',
    example: 'TXN123456789',
    required: false,
  })
  @IsOptional()
  transactionRef?: string;

  @ApiProperty({
    description: 'Date when withdrawal was requested',
    example: '2024-01-15T10:30:00Z',
  })
  requestedAt: Date;

  @ApiProperty({
    description: 'Date when withdrawal was processed',
    example: '2024-01-16T10:30:00Z',
    required: false,
  })
  @IsOptional()
  processedAt?: Date;
}

// ===== DELIVERY HISTORY DTOs =====

export class DeliveryHistoryDto {
  @ApiProperty({
    description: 'Unique delivery record identifier',
    example: 'delivery-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Associated order ID',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Amit Sharma',
  })
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+919876543210',
  })
  customerPhone: string;

  @ApiProperty({
    description: 'Delivery address',
    example: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
  })
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };

  @ApiProperty({
    description: 'Delivery status',
    example: 'delivered',
    enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2024-01-15T14:30:00Z',
  })
  scheduledTime: Date;

  @ApiProperty({
    description: 'Actual delivery completion time',
    example: '2024-01-15T14:25:00Z',
    required: false,
  })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({
    description: 'Customer rating for this delivery',
    example: 5,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @Min(1)
  @Max(5)
  customerRating?: number;

  @ApiProperty({
    description: 'Customer feedback',
    example: 'Great service, very fast delivery!',
    required: false,
  })
  @IsOptional()
  customerFeedback?: string;
}

export class DeliveryStatsDto {
  @ApiProperty({
    description: 'Total deliveries completed',
    example: 150,
  })
  totalDeliveries: number;

  @ApiProperty({
    description: 'Deliveries completed this month',
    example: 25,
  })
  thisMonthDeliveries: number;

  @ApiProperty({
    description: 'Average delivery time in minutes',
    example: 35,
  })
  averageDeliveryTime: number;

  @ApiProperty({
    description: 'On-time delivery percentage',
    example: 92.5,
  })
  onTimeDeliveryRate: number;

  @ApiProperty({
    description: 'Average customer rating',
    example: 4.7,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total distance covered in km',
    example: 450.5,
  })
  totalDistance: number;
}

export class RateDeliveryDto {
  @ApiProperty({
    description: 'Rating for the delivery experience',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating: number;

  @ApiProperty({
    description: 'Feedback about the delivery experience',
    example: 'Excellent service, very professional rider',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Feedback must be a string' })
  feedback?: string;
}

export class UpcomingDeliveryDto {
  @ApiProperty({
    description: 'Unique delivery identifier',
    example: 'delivery-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Associated order ID',
    example: 'order-123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Priya Singh',
  })
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+919876543211',
  })
  customerPhone: string;

  @ApiProperty({
    description: 'Pickup address from vendor',
    example: {
      street: '456 Restaurant Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
    },
  })
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };

  @ApiProperty({
    description: 'Delivery address',
    example: {
      street: '789 Customer Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400003',
    },
  })
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };

  @ApiProperty({
    description: 'Scheduled pickup time',
    example: '2024-01-15T13:00:00Z',
  })
  scheduledPickupTime: Date;

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2024-01-15T14:00:00Z',
  })
  scheduledDeliveryTime: Date;

  @ApiProperty({
    description: 'Order items summary',
    example: ['2x Chicken Burger', '1x French Fries'],
  })
  orderItems: string[];

  @ApiProperty({
    description: 'Special delivery instructions',
    example: 'Call customer before delivery',
    required: false,
  })
  @IsOptional()
  specialInstructions?: string;
}

// ===== ROUTE OPTIMIZATION DTOs =====

export class RouteOptimizationDto {
  @ApiProperty({
    description: 'Unique route identifier',
    example: 'route-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Optimized delivery sequence',
    example: [
      {
        orderId: 'order-1',
        sequence: 1,
        estimatedArrival: '2024-01-15T13:30:00Z',
        address: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      },
    ],
  })
  deliverySequence: Array<{
    orderId: string;
    sequence: number;
    estimatedArrival: Date;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  }>;

  @ApiProperty({
    description: 'Total estimated distance in km',
    example: 15.5,
  })
  totalDistance: number;

  @ApiProperty({
    description: 'Total estimated time in minutes',
    example: 45,
  })
  totalTime: number;

  @ApiProperty({
    description: 'Route optimization timestamp',
    example: '2024-01-15T12:00:00Z',
  })
  optimizedAt: Date;
}

export class RoutePreferencesDto {
  @ApiProperty({
    description: 'Preferred maximum delivery distance in km',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber({}, { message: 'Max distance must be a number' })
  @Min(1, { message: 'Max distance must be at least 1 km' })
  @Max(50, { message: 'Max distance cannot exceed 50 km' })
  maxDeliveryDistance: number;

  @ApiProperty({
    description: 'Preferred areas for delivery',
    example: ['Andheri', 'Bandra', 'Santacruz'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Preferred areas must be an array' })
  @IsString({ each: true, message: 'Each area must be a string' })
  preferredAreas?: string[];

  @ApiProperty({
    description: 'Avoid toll roads',
    example: false,
  })
  @IsBoolean({ message: 'Avoid tolls must be a boolean' })
  avoidTolls: boolean;

  @ApiProperty({
    description: 'Preferred route type',
    example: 'fastest',
    enum: ['fastest', 'shortest', 'scenic'],
  })
  @IsEnum(['fastest', 'shortest', 'scenic'], {
    message: 'Route type must be fastest, shortest, or scenic',
  })
  routeType: 'fastest' | 'shortest' | 'scenic';
}

export class RouteHistoryDto {
  @ApiProperty({
    description: 'Unique route history identifier',
    example: 'route-history-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Date of the route',
    example: '2024-01-15',
  })
  routeDate: Date;

  @ApiProperty({
    description: 'Total deliveries in this route',
    example: 8,
  })
  totalDeliveries: number;

  @ApiProperty({
    description: 'Total distance covered in km',
    example: 25.5,
  })
  totalDistance: number;

  @ApiProperty({
    description: 'Total time taken in minutes',
    example: 180,
  })
  totalTime: number;

  @ApiProperty({
    description: 'Route completion status',
    example: 'completed',
    enum: ['completed', 'partial', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Route start time',
    example: '2024-01-15T09:00:00Z',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Route completion time',
    example: '2024-01-15T12:00:00Z',
    required: false,
  })
  @IsOptional()
  completedAt?: Date;
}

// ===== PERFORMANCE TRACKING DTOs =====

export class PerformanceMetricsDto {
  @ApiProperty({
    description: 'Overall performance score',
    example: 4.7,
    minimum: 0,
    maximum: 5,
  })
  overallScore: number;

  @ApiProperty({
    description: 'Delivery completion rate percentage',
    example: 98.5,
  })
  completionRate: number;

  @ApiProperty({
    description: 'On-time delivery rate percentage',
    example: 92.0,
  })
  onTimeRate: number;

  @ApiProperty({
    description: 'Average customer rating',
    example: 4.6,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total earnings this month',
    example: 12500.0,
  })
  monthlyEarnings: number;

  @ApiProperty({
    description: 'Performance period',
    example: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    },
  })
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export class RiderRatingDto {
  @ApiProperty({
    description: 'Current average rating',
    example: 4.6,
    minimum: 0,
    maximum: 5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of ratings received',
    example: 150,
  })
  totalRatings: number;

  @ApiProperty({
    description: 'Rating distribution',
    example: {
      5: 120,
      4: 25,
      3: 4,
      2: 1,
      1: 0,
    },
  })
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  @ApiProperty({
    description: 'Recent ratings with comments',
    example: [
      {
        rating: 5,
        comment: 'Excellent service!',
        customerName: 'Amit S.',
        date: '2024-01-15T10:30:00Z',
      },
    ],
  })
  recentRatings: Array<{
    rating: number;
    comment: string;
    customerName: string;
    date: Date;
  }>;
}

export class LeaderboardPositionDto {
  @ApiProperty({
    description: 'Current rank in leaderboard',
    example: 15,
  })
  currentRank: number;

  @ApiProperty({
    description: 'Total number of riders in leaderboard',
    example: 250,
  })
  totalRiders: number;

  @ApiProperty({
    description: 'Performance score',
    example: 4.7,
  })
  score: number;

  @ApiProperty({
    description: 'Top performers',
    example: [
      {
        rank: 1,
        name: 'Rider A',
        score: 4.9,
        deliveries: 180,
      },
    ],
  })
  topPerformers: Array<{
    rank: number;
    name: string;
    score: number;
    deliveries: number;
  }>;

  @ApiProperty({
    description: 'Riders around current position',
    example: [
      {
        rank: 14,
        name: 'Rider X',
        score: 4.71,
      },
    ],
  })
  nearbyRiders: Array<{
    rank: number;
    name: string;
    score: number;
  }>;
}

export class PerformanceGoalsDto {
  @ApiProperty({
    description: 'Monthly delivery goal',
    example: 200,
  })
  monthlyDeliveries: number;

  @ApiProperty({
    description: 'Current progress towards monthly goal',
    example: 150,
  })
  currentDeliveries: number;

  @ApiProperty({
    description: 'Monthly earnings goal',
    example: 15000.0,
  })
  monthlyEarnings: number;

  @ApiProperty({
    description: 'Current earnings this month',
    example: 11250.0,
  })
  currentEarnings: number;

  @ApiProperty({
    description: 'Target average rating',
    example: 4.5,
  })
  targetRating: number;

  @ApiProperty({
    description: 'Current average rating',
    example: 4.6,
  })
  currentRating: number;

  @ApiProperty({
    description: 'Days remaining in current month',
    example: 10,
  })
  daysRemaining: number;
}

// ===== AVAILABILITY & SCHEDULING DTOs =====

export class ScheduleSlotDto {
  @ApiProperty({
    description: 'Unique schedule slot identifier',
    example: 'schedule-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Start time of the schedule slot',
    example: '2024-01-15T09:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the schedule slot',
    example: '2024-01-15T18:00:00Z',
  })
  endTime: Date;

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
  dayOfWeek: string;

  @ApiProperty({
    description: 'Whether this slot is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Schedule creation timestamp',
    example: '2024-01-15T08:00:00Z',
  })
  createdAt: Date;
}

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Start time of the schedule slot',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString({}, { message: 'Start time must be a valid date string' })
  startTime: string;

  @ApiProperty({
    description: 'End time of the schedule slot',
    example: '2024-01-15T18:00:00Z',
  })
  @IsDateString({}, { message: 'End time must be a valid date string' })
  endTime: string;

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
  @IsEnum(
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    {
      message: 'Day must be a valid day of the week',
    },
  )
  dayOfWeek: string;
}

export class UpdateScheduleDto {
  @ApiProperty({
    description: 'Start time of the schedule slot',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start time must be a valid date string' })
  startTime?: string;

  @ApiProperty({
    description: 'End time of the schedule slot',
    example: '2024-01-15T19:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End time must be a valid date string' })
  endTime?: string;

  @ApiProperty({
    description: 'Whether this slot is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;
}

export class AvailabilityStatusDto {
  @ApiProperty({
    description: 'Current availability status',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Current schedule slot if available',
    example: {
      id: 'schedule-123',
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T18:00:00Z',
      dayOfWeek: 'monday',
    },
    required: false,
  })
  @IsOptional()
  currentSlot?: {
    id: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: string;
  };

  @ApiProperty({
    description: 'Next scheduled slot',
    example: {
      id: 'schedule-124',
      startTime: '2024-01-16T09:00:00Z',
      endTime: '2024-01-16T18:00:00Z',
      dayOfWeek: 'tuesday',
    },
    required: false,
  })
  @IsOptional()
  nextSlot?: {
    id: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: string;
  };
}

// ===== PAGINATION DTO =====

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginationResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
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
