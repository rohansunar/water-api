import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../../common/dto/order.dto';
import { OrderStatus } from '../../order/interfaces/order.interface';
import {
  // Delivery History DTOs
  DeliveryHistoryDto,
  DeliveryStatsDto,
  RateDeliveryDto,
  UpcomingDeliveryDto,
  // Route Optimization DTOs
  RouteOptimizationDto,
  RoutePreferencesDto,
  RouteHistoryDto,
  // Performance Tracking DTOs
  PerformanceMetricsDto,
  RiderRatingDto,
  LeaderboardPositionDto,
  PerformanceGoalsDto,
  // Availability & Scheduling DTOs
  ScheduleSlotDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  AvailabilityStatusDto,
  // Pagination DTOs
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../common/dto/rider.dto';

export interface DeliveryRider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  isActive: boolean;
  isAvailable: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationUpdateDto {
  latitude: number;
  longitude: number;
}

@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);
  private readonly riders = new Map<string, DeliveryRider>();
  private readonly userRiderIndex = new Map<string, string>(); // userId -> riderId

  async findByUserId(userId: string): Promise<DeliveryRider | null> {
    const riderId = this.userRiderIndex.get(userId);
    if (!riderId) return null;
    return this.riders.get(riderId) || null;
  }

  async getRiderOrders(userId: string): Promise<OrderResponseDto[]> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // In a real implementation, this would fetch orders assigned to this rider
    // For now, return mock data
    const mockOrders: OrderResponseDto[] = [
      {
        id: 'order-rider-1',
        userId: 'customer-1',
        vendorId: 'vendor-1',
        productId: 'product-1',
        quantity: 1,
        totalAmount: 100,
        status: 'assigned',
        schedule: 'instant',
        paymentMethod: 'wallet',
        paymentStatus: 'completed',
        deliveryAddress: {
          street: '456 Delivery Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110002',
          latitude: 28.6129,
          longitude: 77.2295,
          contactPhone: '9876543210',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'order-rider-2',
        userId: 'customer-2',
        vendorId: 'vendor-1',
        productId: 'product-2',
        quantity: 2,
        totalAmount: 200,
        status: 'picked_up',
        schedule: 'instant',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        deliveryAddress: {
          street: '789 Customer Avenue',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110003',
          latitude: 28.6239,
          longitude: 77.2395,
          contactPhone: '9876543211',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return mockOrders;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Validate status transition
    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(updateOrderStatusDto.status)) {
      throw new BadRequestException('Invalid status for delivery rider');
    }

    // In a real implementation, this would update the order through OrderService
    // For now, return mock updated order
    const updatedOrder: OrderResponseDto = {
      id: orderId,
      userId: 'customer-1',
      vendorId: 'vendor-1',
      productId: 'product-1',
      quantity: 1,
      totalAmount: 100,
      status: updateOrderStatusDto.status,
      schedule: 'instant',
      paymentMethod: 'wallet',
      paymentStatus: 'completed',
      deliveryAddress: {
        street: '456 Delivery Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110002',
        latitude: 28.6129,
        longitude: 77.2295,
        contactPhone: '9876543210',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(
      `Rider ${rider.id} updated order ${orderId} status to ${updateOrderStatusDto.status}`,
    );
    return updatedOrder;
  }

  async updateLocation(
    userId: string,
    locationUpdateDto: LocationUpdateDto,
  ): Promise<{ message: string; location: any }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Update rider location
    rider.currentLocation = {
      latitude: locationUpdateDto.latitude,
      longitude: locationUpdateDto.longitude,
      updatedAt: new Date(),
    };
    rider.updatedAt = new Date();

    this.riders.set(rider.id, rider);

    this.logger.log(
      `Updated location for rider ${rider.id}: ${locationUpdateDto.latitude}, ${locationUpdateDto.longitude}`,
    );

    return {
      message: 'Location updated successfully',
      location: rider.currentLocation,
    };
  }

  async getRiderProfile(userId: string): Promise<DeliveryRider> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }
    return rider;
  }

  async updateAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<DeliveryRider> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    rider.isAvailable = isAvailable;
    rider.updatedAt = new Date();
    this.riders.set(rider.id, rider);

    this.logger.log(
      `Rider ${rider.id} availability updated to: ${isAvailable}`,
    );
    return rider;
  }

  async create(
    userId: string,
    name: string,
    phone: string,
    vehicleType: string,
    vehicleNumber: string,
  ): Promise<DeliveryRider> {
    const rider: DeliveryRider = {
      id: uuidv4(),
      userId,
      name,
      phone,
      vehicleType,
      vehicleNumber,
      isActive: true,
      isAvailable: true,
      rating: 4.0 + Math.random(), // Random rating between 4.0-5.0
      totalDeliveries: Math.floor(Math.random() * 500),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.riders.set(rider.id, rider);
    this.userRiderIndex.set(userId, rider.id);

    this.logger.log(`Created delivery rider: ${rider.id} for user: ${userId}`);
    return rider;
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    const testRiders = [
      {
        userId: '2749f45b-5f31-469d-aef4-eaf5697fd6cd', // Test rider user (7777777777)
        name: 'Test Rider',
        phone: '7777777777',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'DL01AB1234',
      },
      {
        userId: 'rider-2',
        name: 'Rider Two',
        phone: '6666666666',
        vehicleType: 'Van',
        vehicleNumber: 'DL02CD5678',
      },
    ];

    for (const riderData of testRiders) {
      const existingRider = await this.findByUserId(riderData.userId);
      if (!existingRider) {
        await this.create(
          riderData.userId,
          riderData.name,
          riderData.phone,
          riderData.vehicleType,
          riderData.vehicleNumber,
        );
      }
    }

    this.logger.log('Delivery rider test data seeded successfully');
  }

  // ===== DELIVERY HISTORY SERVICE METHODS =====

  async getDeliveryHistory(
    userId: string,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<DeliveryHistoryDto>> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock delivery history - in real implementation, fetch from database
    const mockDeliveries: DeliveryHistoryDto[] = [
      {
        id: 'delivery-1',
        orderId: 'order-1',
        customerName: 'Amit Sharma',
        customerPhone: '+919876543210',
        deliveryAddress: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        status: 'delivered',
        scheduledTime: new Date('2024-01-15T14:00:00Z'),
        completedAt: new Date('2024-01-15T13:45:00Z'),
        customerRating: 5,
        customerFeedback: 'Excellent service!',
      },
    ];

    const { page = 1, limit = 10 } = paginationDto;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedData = mockDeliveries.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: mockDeliveries.length,
      page,
      limit,
      totalPages: Math.ceil(mockDeliveries.length / limit),
      hasNext: endIndex < mockDeliveries.length,
      hasPrev: page > 1,
    };
  }

  async getDeliveryDetails(
    userId: string,
    deliveryId: string,
  ): Promise<DeliveryHistoryDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock delivery details - in real implementation, fetch from database
    const delivery: DeliveryHistoryDto = {
      id: deliveryId,
      orderId: 'order-123',
      customerName: 'Priya Singh',
      customerPhone: '+919876543211',
      deliveryAddress: {
        street: '456 Customer Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
      },
      status: 'delivered',
      scheduledTime: new Date('2024-01-15T14:00:00Z'),
      completedAt: new Date('2024-01-15T13:45:00Z'),
      customerRating: 5,
      customerFeedback: 'Great service, very professional!',
    };

    return delivery;
  }

  async getDeliveryStats(userId: string): Promise<DeliveryStatsDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock delivery statistics - in real implementation, calculate from database
    return {
      totalDeliveries: 150,
      thisMonthDeliveries: 25,
      averageDeliveryTime: 35,
      onTimeDeliveryRate: 92.5,
      averageRating: 4.7,
      totalDistance: 450.5,
    };
  }

  async rateDelivery(
    userId: string,
    deliveryId: string,
    rateDto: RateDeliveryDto,
  ): Promise<DeliveryHistoryDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock rating update - in real implementation, update database
    const delivery: DeliveryHistoryDto = {
      id: deliveryId,
      orderId: 'order-123',
      customerName: 'Customer Name',
      customerPhone: '+919876543210',
      deliveryAddress: {
        street: '123 Delivery Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      status: 'delivered',
      scheduledTime: new Date('2024-01-15T14:00:00Z'),
      completedAt: new Date('2024-01-15T13:45:00Z'),
      customerRating: rateDto.rating,
      customerFeedback: rateDto.feedback,
    };

    this.logger.log(
      `Delivery ${deliveryId} rated ${rateDto.rating} by rider ${rider.id}`,
    );
    return delivery;
  }

  async getUpcomingDeliveries(userId: string): Promise<UpcomingDeliveryDto[]> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock upcoming deliveries - in real implementation, fetch from database
    const upcomingDeliveries: UpcomingDeliveryDto[] = [
      {
        id: 'upcoming-delivery-1',
        orderId: 'order-upcoming-1',
        customerName: 'Rajesh Kumar',
        customerPhone: '+919876543212',
        pickupAddress: {
          street: '789 Restaurant Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400003',
        },
        deliveryAddress: {
          street: '321 Customer Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400004',
        },
        scheduledPickupTime: new Date('2024-01-16T13:00:00Z'),
        scheduledDeliveryTime: new Date('2024-01-16T14:00:00Z'),
        orderItems: ['2x Chicken Burger', '1x French Fries'],
        specialInstructions: 'Call customer before delivery',
      },
    ];

    return upcomingDeliveries;
  }

  // ===== ROUTE OPTIMIZATION SERVICE METHODS =====

  async getOptimizedRoute(userId: string): Promise<RouteOptimizationDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock route optimization - in real implementation, use routing algorithms
    const route: RouteOptimizationDto = {
      id: `route-${Date.now()}`,
      deliverySequence: [
        {
          orderId: 'order-1',
          sequence: 1,
          estimatedArrival: new Date('2024-01-16T13:30:00Z'),
          address: {
            street: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
        },
        {
          orderId: 'order-2',
          sequence: 2,
          estimatedArrival: new Date('2024-01-16T14:15:00Z'),
          address: {
            street: '456 Oak Avenue',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400002',
          },
        },
      ],
      totalDistance: 15.5,
      totalTime: 45,
      optimizedAt: new Date(),
    };

    return route;
  }

  async setRoutePreferences(
    userId: string,
    preferencesDto: RoutePreferencesDto,
  ): Promise<RoutePreferencesDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock preference update - in real implementation, save to database
    this.logger.log(
      `Route preferences updated for rider ${rider.id}: ${JSON.stringify(preferencesDto)}`,
    );
    return preferencesDto;
  }

  async getRouteHistory(
    userId: string,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginationResponseDto<RouteHistoryDto>> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock route history - in real implementation, fetch from database
    const mockRoutes: RouteHistoryDto[] = [
      {
        id: 'route-history-1',
        routeDate: new Date('2024-01-15'),
        totalDeliveries: 8,
        totalDistance: 25.5,
        totalTime: 180,
        status: 'completed',
        startedAt: new Date('2024-01-15T09:00:00Z'),
        completedAt: new Date('2024-01-15T12:00:00Z'),
      },
    ];

    const { page = 1, limit = 10 } = paginationDto;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedData = mockRoutes.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: mockRoutes.length,
      page,
      limit,
      totalPages: Math.ceil(mockRoutes.length / limit),
      hasNext: endIndex < mockRoutes.length,
      hasPrev: page > 1,
    };
  }

  async completeRoute(
    userId: string,
    routeId: string,
  ): Promise<RouteHistoryDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock route completion - in real implementation, update database
    const route: RouteHistoryDto = {
      id: routeId,
      routeDate: new Date(),
      totalDeliveries: 8,
      totalDistance: 25.5,
      totalTime: 180,
      status: 'completed',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      completedAt: new Date(),
    };

    this.logger.log(`Route ${routeId} completed by rider ${rider.id}`);
    return route;
  }

  // ===== PERFORMANCE TRACKING SERVICE METHODS =====

  async getPerformanceMetrics(userId: string): Promise<PerformanceMetricsDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock performance metrics - in real implementation, calculate from database
    const currentMonth = new Date();
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );

    return {
      overallScore: 4.7,
      completionRate: 98.5,
      onTimeRate: 92.0,
      averageRating: 4.6,
      monthlyEarnings: 12500.0,
      period: {
        startDate: startOfMonth,
        endDate: endOfMonth,
      },
    };
  }

  async getRiderRating(userId: string): Promise<RiderRatingDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock rating details - in real implementation, fetch from database
    return {
      averageRating: 4.6,
      totalRatings: 150,
      ratingDistribution: {
        5: 120,
        4: 25,
        3: 4,
        2: 1,
        1: 0,
      },
      recentRatings: [
        {
          rating: 5,
          comment: 'Excellent service!',
          customerName: 'Amit S.',
          date: new Date('2024-01-15T10:30:00Z'),
        },
      ],
    };
  }

  async getLeaderboardPosition(
    userId: string,
  ): Promise<LeaderboardPositionDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock leaderboard data - in real implementation, calculate from database
    return {
      currentRank: 15,
      totalRiders: 250,
      score: 4.7,
      topPerformers: [
        {
          rank: 1,
          name: 'Rider A',
          score: 4.9,
          deliveries: 180,
        },
        {
          rank: 2,
          name: 'Rider B',
          score: 4.8,
          deliveries: 175,
        },
      ],
      nearbyRiders: [
        {
          rank: 14,
          name: 'Rider X',
          score: 4.71,
        },
        {
          rank: 16,
          name: 'Rider Y',
          score: 4.68,
        },
      ],
    };
  }

  async getPerformanceGoals(userId: string): Promise<PerformanceGoalsDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock performance goals - in real implementation, fetch from database
    const currentMonth = new Date();
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    ).getDate();
    const daysRemaining = daysInMonth - currentMonth.getDate();

    return {
      monthlyDeliveries: 200,
      currentDeliveries: 150,
      monthlyEarnings: 15000.0,
      currentEarnings: 11250.0,
      targetRating: 4.5,
      currentRating: 4.6,
      daysRemaining,
    };
  }

  // ===== AVAILABILITY & SCHEDULING SERVICE METHODS =====

  async getSchedule(userId: string): Promise<ScheduleSlotDto[]> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock schedule slots - in real implementation, fetch from database
    const scheduleSlots: ScheduleSlotDto[] = [
      {
        id: 'schedule-1',
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T18:00:00Z'),
        dayOfWeek: 'monday',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    return scheduleSlots;
  }

  async createScheduleSlot(
    userId: string,
    scheduleDto: CreateScheduleDto,
  ): Promise<ScheduleSlotDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock schedule slot creation - in real implementation, save to database
    const scheduleSlot: ScheduleSlotDto = {
      id: `schedule-${Date.now()}`,
      startTime: new Date(scheduleDto.startTime),
      endTime: new Date(scheduleDto.endTime),
      dayOfWeek: scheduleDto.dayOfWeek,
      isActive: true,
      createdAt: new Date(),
    };

    this.logger.log(
      `Schedule slot created for rider ${rider.id}: ${scheduleDto.dayOfWeek}`,
    );
    return scheduleSlot;
  }

  async updateScheduleSlot(
    userId: string,
    slotId: string,
    updateDto: UpdateScheduleDto,
  ): Promise<ScheduleSlotDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock schedule slot update - in real implementation, update database
    const updatedSlot: ScheduleSlotDto = {
      id: slotId,
      startTime: updateDto.startTime
        ? new Date(updateDto.startTime)
        : new Date('2024-01-15T09:00:00Z'),
      endTime: updateDto.endTime
        ? new Date(updateDto.endTime)
        : new Date('2024-01-15T18:00:00Z'),
      dayOfWeek: 'monday',
      isActive: updateDto.isActive ?? true,
      createdAt: new Date(),
    };

    this.logger.log(`Schedule slot ${slotId} updated for rider ${rider.id}`);
    return updatedSlot;
  }

  async deleteScheduleSlot(
    userId: string,
    slotId: string,
  ): Promise<{ message: string }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock schedule slot deletion - in real implementation, delete from database
    this.logger.log(`Schedule slot ${slotId} deleted for rider ${rider.id}`);
    return { message: 'Schedule slot deleted successfully' };
  }

  async getAvailabilityStatus(userId: string): Promise<AvailabilityStatusDto> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock availability status - in real implementation, check current schedule
    const currentTime = new Date();
    const currentDay = currentTime
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();

    return {
      isAvailable: rider.isAvailable,
      currentSlot: rider.isAvailable
        ? {
            id: 'current-slot',
            startTime: new Date(currentTime.getTime() - 60 * 60 * 1000), // 1 hour ago
            endTime: new Date(currentTime.getTime() + 7 * 60 * 60 * 1000), // 7 hours from now
            dayOfWeek: currentDay,
          }
        : undefined,
      nextSlot: rider.isAvailable
        ? undefined
        : {
            id: 'next-slot',
            startTime: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            endTime: new Date(currentTime.getTime() + 33 * 60 * 60 * 1000), // Tomorrow + 9 hours
            dayOfWeek: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)
              .toLocaleDateString('en-US', { weekday: 'long' })
              .toLowerCase(),
          },
    };
  }

  // ===== PHASE 2 ADDITIONAL METHODS =====

  async endShift(
    userId: string,
    shiftEndDto: {
      cashCollected: number;
      totalDeliveries: number;
      notes?: string;
    },
  ): Promise<{ message: string; shiftSummary: any }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock shift end processing
    const shiftSummary = {
      shiftId: `shift-${Date.now()}`,
      startTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      endTime: new Date(),
      totalDeliveries: shiftEndDto.totalDeliveries,
      cashCollected: shiftEndDto.cashCollected,
      status: 'completed',
      notes: shiftEndDto.notes,
    };

    this.logger.log(
      `Shift ended for rider ${rider.id}: ${shiftEndDto.totalDeliveries} deliveries, ₹${shiftEndDto.cashCollected} collected`,
    );
    return {
      message: 'Shift ended successfully',
      shiftSummary,
    };
  }

  async getNotifications(
    userId: string,
    paginationDto: PaginationQueryDto,
  ): Promise<{ notifications: any[]; unreadCount: number }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock notifications
    const mockNotifications = [
      {
        id: 'notif-1',
        type: 'delivery_assigned',
        title: 'New Delivery Assigned',
        message: 'You have been assigned a new delivery order #ORD-001',
        read: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        id: 'notif-2',
        type: 'payment_received',
        title: 'Payment Received',
        message: 'Payment of ₹150 has been credited to your account',
        read: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    ];

    const { page = 1, limit = 10 } = paginationDto;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedNotifications = mockNotifications.slice(
      startIndex,
      endIndex,
    );
    const unreadCount = mockNotifications.filter((n) => !n.read).length;

    return {
      notifications: paginatedNotifications,
      unreadCount,
    };
  }

  async createSupportTicket(
    userId: string,
    supportDto: {
      subject: string;
      message: string;
      priority?: string;
      category?: string;
    },
  ): Promise<{
    ticketId: string;
    status: string;
    createdAt: Date;
    estimatedResolution: Date;
  }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock support ticket creation
    const ticketId = `TICKET-${Date.now()}`;
    const createdAt = new Date();
    const estimatedResolution = new Date(
      createdAt.getTime() + 24 * 60 * 60 * 1000,
    ); // 24 hours from now

    this.logger.log(
      `Support ticket created for rider ${rider.id}: ${supportDto.subject}`,
    );

    return {
      ticketId,
      status: 'open',
      createdAt,
      estimatedResolution,
    };
  }

  async completeDelivery(
    userId: string,
    taskId: string,
    deliveryDto: {
      deliveryNotes?: string;
      customerSignature?: string;
      photoRequired?: boolean;
    },
  ): Promise<{
    taskId: string;
    status: string;
    completedAt: Date;
    photoUrl?: string;
    message: string;
  }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock delivery completion
    const completedAt = new Date();
    const photoUrl = deliveryDto.photoRequired
      ? `https://example.com/photos/${taskId}.jpg`
      : undefined;

    this.logger.log(`Delivery ${taskId} completed by rider ${rider.id}`);

    return {
      taskId,
      status: 'completed',
      completedAt,
      photoUrl,
      message: 'Delivery completed successfully',
    };
  }

  async failDelivery(
    userId: string,
    taskId: string,
    failureDto: {
      reason: string;
      details?: string;
      retryable?: boolean;
      customerContacted?: boolean;
    },
  ): Promise<{
    taskId: string;
    status: string;
    failedAt: Date;
    reason: string;
    canRetry: boolean;
    message: string;
  }> {
    const rider = await this.findByUserId(userId);
    if (!rider) {
      throw new NotFoundException('Delivery rider profile not found');
    }

    // Mock delivery failure
    const failedAt = new Date();
    const canRetry = failureDto.retryable !== false;

    this.logger.log(
      `Delivery ${taskId} failed by rider ${rider.id}: ${failureDto.reason}`,
    );

    return {
      taskId,
      status: 'failed',
      failedAt,
      reason: failureDto.reason,
      canRetry,
      message: 'Delivery marked as failed',
    };
  }
}
