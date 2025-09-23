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
} from '../common/dto/order.dto';
import { OrderStatus } from '../common/interfaces/order.interface';

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
}
