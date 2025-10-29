import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/database/prisma.service';
import { DeliveryRiderResponseDto } from '../../common/dto/rider.dto';
import { TaskStatus } from '../../common/services/task-state-machine.service';

export interface AuthResponseDto {
  token: string;
  rider: DeliveryRiderResponseDto;
  message: string;
}

@Injectable()
export class RiderAuthService {
  private readonly logger = new Logger(RiderAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate rider and generate JWT token
   */
  async authenticateRider(phone: string): Promise<AuthResponseDto> {
    this.logger.log(`Authenticating rider with phone: ${phone}`);

    // Find rider by phone
    const rider = await this.prisma.rider.findFirst({
      where: {
        phone: phone,
        isActive: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found. Please contact support.');
    }

    // Generate JWT token
    const payload = {
      sub: rider.id.toString(),
      phone: rider.phone,
      role: 'delivery_rider',
      type: 'rider',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '24h', // Token expires in 24 hours
    });

    // Get rider profile
    const riderProfile = await this.getRiderProfile(rider.id.toString());

    this.logger.log(`Rider authenticated successfully: ${rider.id}`);

    return {
      token,
      rider: riderProfile,
      message: 'Authentication successful',
    };
  }

  /**
   * Get rider profile by user ID
   */
  async getRiderProfile(userId: string): Promise<DeliveryRiderResponseDto> {
    this.logger.log(`Getting rider profile for user: ${userId}`);

    const rider = await this.prisma.rider.findUnique({
      where: { id: BigInt(userId) },
      include: {
        deliveryTasks: {
          where: {
            status: {
              in: [
                TaskStatus.ASSIGNED,
                TaskStatus.ACCEPTED,
                TaskStatus.PICKED_UP,
              ],
            },
          },
          orderBy: { scheduledPickup: 'asc' },
          take: 1,
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    // Calculate rider statistics
    const totalDeliveries = await this.prisma.deliveryTask.count({
      where: {
        riderId: BigInt(userId),
        status: TaskStatus.DELIVERED,
      },
    });

    const averageRating = await this.calculateAverageRating(BigInt(userId));

    return {
      id: rider.uuid,
      userId: rider.id.toString(),
      name: rider.name,
      phone: rider.phone || '',
      vehicleType: rider.vehicleType || '',
      vehicleNumber: rider.licenseNo || '',
      isActive: rider.isActive,
      isAvailable: rider.status === 'active',
      currentLocation: rider.shift as any, // Location data if available
      rating: averageRating,
      totalDeliveries,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt,
    };
  }

  /**
   * Create new rider profile
   */
  async createRider(riderData: {
    phone: string;
    name: string;
    vehicleType: string;
    licenseNo: string;
    email?: string;
  }): Promise<DeliveryRiderResponseDto> {
    this.logger.log(`Creating new rider profile for phone: ${riderData.phone}`);

    // Check if rider already exists
    const existingRider = await this.prisma.rider.findFirst({
      where: { phone: riderData.phone },
    });

    if (existingRider) {
      throw new BadRequestException(
        'Rider already exists with this phone number',
      );
    }

    // Create new rider
    const rider = await this.prisma.rider.create({
      data: {
        phone: riderData.phone,
        name: riderData.name,
        vehicleType: riderData.vehicleType,
        licenseNo: riderData.licenseNo,
        email: riderData.email,
        status: 'active',
        isActive: true,
      },
    });

    this.logger.log(`Rider profile created successfully: ${rider.id}`);

    return this.getRiderProfile(rider.id.toString());
  }

  /**
   * Update rider profile
   */
  async updateRiderProfile(
    userId: string,
    updateData: Partial<{
      name: string;
      vehicleType: string;
      licenseNo: string;
      email: string;
      status: string;
    }>,
  ): Promise<DeliveryRiderResponseDto> {
    this.logger.log(`Updating rider profile for user: ${userId}`);

    const rider = await this.prisma.rider.update({
      where: { id: BigInt(userId) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return this.getRiderProfile(rider.id.toString());
  }

  /**
   * Update rider availability
   */
  async updateAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<void> {
    this.logger.log(
      `Updating availability for rider ${userId}: ${isAvailable}`,
    );

    await this.prisma.rider.update({
      where: { id: BigInt(userId) },
      data: {
        status: isAvailable ? 'active' : 'inactive',
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get rider statistics
   */
  async getRiderStats(userId: string): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    failedDeliveries: number;
    averageRating: number;
    totalEarnings: number;
    thisMonthDeliveries: number;
  }> {
    const riderId = BigInt(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDeliveries,
      completedDeliveries,
      failedDeliveries,
      thisMonthDeliveries,
    ] = await Promise.all([
      this.prisma.deliveryTask.count({
        where: { riderId },
      }),
      this.prisma.deliveryTask.count({
        where: {
          riderId,
          status: TaskStatus.DELIVERED,
        },
      }),
      this.prisma.deliveryTask.count({
        where: {
          riderId,
          status: TaskStatus.FAILED,
        },
      }),
      this.prisma.deliveryTask.count({
        where: {
          riderId,
          status: TaskStatus.DELIVERED,
          deliveredAt: {
            gte: startOfMonth,
          },
        },
      }),
    ]);

    const averageRating = await this.calculateAverageRating(riderId);

    // Calculate total earnings (mock calculation - in real app, this would come from cash transactions)
    const totalEarnings = completedDeliveries * 50; // Assuming ₹50 per delivery

    return {
      totalDeliveries,
      completedDeliveries,
      failedDeliveries,
      averageRating,
      totalEarnings,
      thisMonthDeliveries,
    };
  }

  /**
   * Calculate average rating for rider
   */
  private async calculateAverageRating(riderId: bigint): Promise<number> {
    // In a real implementation, this would calculate from customer ratings
    // For now, return a mock rating
    return 4.5;
  }

  /**
   * Validate rider token
   */
  async validateRider(userId: string): Promise<boolean> {
    const rider = await this.prisma.rider.findUnique({
      where: { id: BigInt(userId) },
    });

    return !!(rider && rider.isActive);
  }

  /**
   * Get rider by phone number
   */
  async findByPhone(phone: string) {
    return this.prisma.rider.findFirst({
      where: { phone },
    });
  }

  /**
   * Get rider by ID
   */
  async findById(id: string) {
    return this.prisma.rider.findUnique({
      where: { id: BigInt(id) },
    });
  }
}
