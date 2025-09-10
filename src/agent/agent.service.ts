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

export interface DeliveryAgent {
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
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly agents = new Map<string, DeliveryAgent>();
  private readonly userAgentIndex = new Map<string, string>(); // userId -> agentId

  async findByUserId(userId: string): Promise<DeliveryAgent | null> {
    const agentId = this.userAgentIndex.get(userId);
    if (!agentId) return null;
    return this.agents.get(agentId) || null;
  }

  async getAgentOrders(userId: string): Promise<OrderResponseDto[]> {
    const agent = await this.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found');
    }

    // In a real implementation, this would fetch orders assigned to this agent
    // For now, return mock data
    const mockOrders: OrderResponseDto[] = [
      {
        id: 'order-agent-1',
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
        id: 'order-agent-2',
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
    const agent = await this.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found');
    }

    // Validate status transition
    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(updateOrderStatusDto.status)) {
      throw new BadRequestException('Invalid status for delivery agent');
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
      `Agent ${agent.id} updated order ${orderId} status to ${updateOrderStatusDto.status}`,
    );
    return updatedOrder;
  }

  async updateLocation(
    userId: string,
    locationUpdateDto: LocationUpdateDto,
  ): Promise<{ message: string; location: any }> {
    const agent = await this.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found');
    }

    // Update agent location
    agent.currentLocation = {
      latitude: locationUpdateDto.latitude,
      longitude: locationUpdateDto.longitude,
      updatedAt: new Date(),
    };
    agent.updatedAt = new Date();

    this.agents.set(agent.id, agent);

    this.logger.log(
      `Updated location for agent ${agent.id}: ${locationUpdateDto.latitude}, ${locationUpdateDto.longitude}`,
    );

    return {
      message: 'Location updated successfully',
      location: agent.currentLocation,
    };
  }

  async getAgentProfile(userId: string): Promise<DeliveryAgent> {
    const agent = await this.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found');
    }
    return agent;
  }

  async updateAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<DeliveryAgent> {
    const agent = await this.findByUserId(userId);
    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found');
    }

    agent.isAvailable = isAvailable;
    agent.updatedAt = new Date();
    this.agents.set(agent.id, agent);

    this.logger.log(
      `Agent ${agent.id} availability updated to: ${isAvailable}`,
    );
    return agent;
  }

  async create(
    userId: string,
    name: string,
    phone: string,
    vehicleType: string,
    vehicleNumber: string,
  ): Promise<DeliveryAgent> {
    const agent: DeliveryAgent = {
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

    this.agents.set(agent.id, agent);
    this.userAgentIndex.set(userId, agent.id);

    this.logger.log(`Created delivery agent: ${agent.id} for user: ${userId}`);
    return agent;
  }

  // Seed test data
  async seedTestData(): Promise<void> {
    const testAgents = [
      {
        userId: '2749f45b-5f31-469d-aef4-eaf5697fd6cd', // Test agent user (7777777777)
        name: 'Test Agent',
        phone: '7777777777',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'DL01AB1234',
      },
      {
        userId: 'agent-2',
        name: 'Agent Two',
        phone: '6666666666',
        vehicleType: 'Van',
        vehicleNumber: 'DL02CD5678',
      },
    ];

    for (const agentData of testAgents) {
      const existingAgent = await this.findByUserId(agentData.userId);
      if (!existingAgent) {
        await this.create(
          agentData.userId,
          agentData.name,
          agentData.phone,
          agentData.vehicleType,
          agentData.vehicleNumber,
        );
      }
    }

    this.logger.log('Delivery agent test data seeded successfully');
  }
}
