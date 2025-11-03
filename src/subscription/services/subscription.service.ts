import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  DeliveryStatus,
  PaymentMethod,
} from '../interfaces/subscription.interface';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
} from '../dto/subscription.dto';
import { ProductService } from '../../product/services/product.service';
import { OrderService } from '../../order/services/order.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly userSubscriptionIndex = new Map<string, string[]>(); // userId -> subscriptionIds
  private readonly vendorSubscriptionIndex = new Map<string, string[]>(); // vendorId -> subscriptionIds

  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
  ) {}

  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    try {
      // Validate product exists and is available
      const product = await this.productService.findById(
        createSubscriptionDto.product_id,
      );
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestException(
          'Product is not available for subscription',
        );
      }

      // TODO: Get user details without UserService
      const user = { phone: '0000000000' }; // Mock user
      this.logger.log(`User validation needed for userId: ${userId}`);

      // Calculate pricing
      const itemTotal = product.price * createSubscriptionDto.quantity;
      const depositAmount = product.hasDeposit
        ? product.depositAmount * createSubscriptionDto.quantity
        : 0;
      const deliveryFee = 15; // Default delivery fee
      const totalAmount = itemTotal + depositAmount + deliveryFee;

      // Parse dates
      const startDate = new Date(createSubscriptionDto.start_date);
      const endDate = createSubscriptionDto.end_date
        ? new Date(createSubscriptionDto.end_date)
        : undefined;

      // Validate dates
      if (startDate < new Date()) {
        throw new BadRequestException('Start date cannot be in the past');
      }

      if (endDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Calculate next delivery date
      const nextDeliveryDate = this.calculateNextDeliveryDate(
        startDate,
        createSubscriptionDto.frequency,
        createSubscriptionDto.days,
      );

      // Create subscription
      const subscription: Subscription = {
        id: uuidv4(),
        userId,
        productId: createSubscriptionDto.product_id,
        vendorId: product.vendorId.toString(),
        frequency: createSubscriptionDto.frequency,
        quantity: createSubscriptionDto.quantity,
        deliveryDays:
          createSubscriptionDto.days ||
          this.getDefaultDeliveryDays(createSubscriptionDto.frequency),
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        deliveryAddress:
          createSubscriptionDto.delivery_address ||
          this.getDefaultAddress(user),
        paymentMethod: PaymentMethod.WALLET, // Default to wallet
        totalAmount,
        nextDeliveryDate,
        deliveryHistory: [],
        specialInstructions: createSubscriptionDto.special_instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store subscription
      this.subscriptions.set(subscription.id, subscription);

      // Update indexes
      const userSubscriptions = this.userSubscriptionIndex.get(userId) || [];
      userSubscriptions.push(subscription.id);
      this.userSubscriptionIndex.set(userId, userSubscriptions);

      const vendorSubscriptions =
        this.vendorSubscriptionIndex.get(product.vendorId.toString()) || [];
      vendorSubscriptions.push(subscription.id);
      this.vendorSubscriptionIndex.set(
        product.vendorId.toString(),
        vendorSubscriptions,
      );

      this.logger.log(
        `Created subscription ${subscription.id} for user ${userId}`,
      );

      return this.mapToResponseDto(subscription);
    } catch (error) {
      this.logger.error(
        `Failed to create subscription for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async findByUser(userId: string): Promise<SubscriptionResponseDto[]> {
    const subscriptionIds = this.userSubscriptionIndex.get(userId) || [];
    const subscriptions = subscriptionIds
      .map((id) => this.subscriptions.get(id))
      .filter(Boolean);

    // Sort by creation date (newest first)
    subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return subscriptions.map((subscription) =>
      this.mapToResponseDto(subscription),
    );
  }

  async findById(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async update(
    subscriptionId: string,
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own subscriptions',
      );
    }

    // Update fields
    if (updateSubscriptionDto.frequency !== undefined) {
      subscription.frequency = updateSubscriptionDto.frequency;
      subscription.deliveryDays =
        updateSubscriptionDto.days ||
        this.getDefaultDeliveryDays(updateSubscriptionDto.frequency);
    }

    if (updateSubscriptionDto.quantity !== undefined) {
      subscription.quantity = updateSubscriptionDto.quantity;
      // Recalculate total amount
      const product = await this.productService.findById(
        subscription.productId,
      );
      if (product) {
        const itemTotal = product.price * subscription.quantity;
        const depositAmount = product.hasDeposit
          ? product.depositAmount * subscription.quantity
          : 0;
        subscription.totalAmount = itemTotal + depositAmount + 15; // 15 is delivery fee
      }
    }

    if (updateSubscriptionDto.status !== undefined) {
      subscription.status = updateSubscriptionDto.status as SubscriptionStatus;
    }

    if (updateSubscriptionDto.special_instructions !== undefined) {
      subscription.specialInstructions =
        updateSubscriptionDto.special_instructions;
    }

    if (updateSubscriptionDto.delivery_address !== undefined) {
      subscription.deliveryAddress = updateSubscriptionDto.delivery_address;
    }

    // Recalculate next delivery date if frequency or days changed
    if (
      updateSubscriptionDto.frequency !== undefined ||
      updateSubscriptionDto.days !== undefined
    ) {
      subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
        new Date(),
        subscription.frequency,
        subscription.deliveryDays,
      );
    }

    subscription.updatedAt = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    this.logger.log(
      `Updated subscription ${subscriptionId} for user ${userId}`,
    );
    return this.mapToResponseDto(subscription);
  }

  async cancel(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException(
        'You can only cancel your own subscriptions',
      );
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(
      `Cancelled subscription ${subscriptionId} for user ${userId}`,
    );

    return this.mapToResponseDto(subscription);
  }

  async pause(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException(
        'You can only pause your own subscriptions',
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(`Paused subscription ${subscriptionId} for user ${userId}`);

    return this.mapToResponseDto(subscription);
  }

  async resume(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException(
        'You can only resume your own subscriptions',
      );
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.nextDeliveryDate = this.calculateNextDeliveryDate(
      new Date(),
      subscription.frequency,
      subscription.deliveryDays,
    );
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(
      `Resumed subscription ${subscriptionId} for user ${userId}`,
    );

    return this.mapToResponseDto(subscription);
  }

  private calculateNextDeliveryDate(
    startDate: Date,
    frequency: SubscriptionFrequency,
    days?: string[],
  ): Date {
    const nextDate = new Date(startDate);

    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case SubscriptionFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case SubscriptionFrequency.CUSTOM:
        if (days && days.length > 0) {
          // Find next delivery day
          const dayMap = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
            sunday: 0,
          };
          const currentDay = nextDate.getDay();
          const deliveryDays = days
            .map((day) => dayMap[day.toLowerCase()])
            .filter((d) => d !== undefined)
            .sort();

          let nextDeliveryDay = deliveryDays.find((day) => day > currentDay);
          if (!nextDeliveryDay) {
            nextDeliveryDay = deliveryDays[0];
            nextDate.setDate(nextDate.getDate() + 7); // Next week
          }

          const daysToAdd = nextDeliveryDay - currentDay;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          nextDate.setDate(nextDate.getDate() + 7); // Default to weekly
        }
        break;
    }

    return nextDate;
  }

  private getDefaultDeliveryDays(frequency: SubscriptionFrequency): string[] {
    switch (frequency) {
      case SubscriptionFrequency.DAILY:
        return [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ];
      case SubscriptionFrequency.WEEKLY:
        return ['monday'];
      case SubscriptionFrequency.CUSTOM:
        return ['monday', 'wednesday', 'friday'];
      default:
        return ['monday'];
    }
  }

  private getDefaultAddress(user: any): any {
    return {
      street: '123 Default Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.209,
      contactPhone: user.phone,
    };
  }

  private mapToResponseDto(
    subscription: Subscription,
  ): SubscriptionResponseDto {
    return {
      id: subscription.id,
      userId: subscription.userId,
      productId: subscription.productId,
      vendorId: subscription.vendorId,
      frequency: subscription.frequency,
      quantity: subscription.quantity,
      deliveryDays: subscription.deliveryDays,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      nextDeliveryDate: subscription.nextDeliveryDate,
      totalAmount: subscription.totalAmount,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
  async getAnalytics(subscriptionId: string, userId: string): Promise<any> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException(
        'You can only view analytics for your own subscriptions',
      );
    }

    // Calculate analytics based on delivery history
    const deliveryHistory = subscription.deliveryHistory || [];
    const totalDeliveries = deliveryHistory.length;
    const onTimeDeliveries = deliveryHistory.filter(
      (delivery) => delivery.status === DeliveryStatus.DELIVERED,
    ).length;

    const onTimeRate =
      totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    // Calculate average cost (simplified)
    const averageCost = subscription.totalAmount;

    // Calculate savings vs one-time purchases
    const oneTimeCost = totalDeliveries * subscription.totalAmount;
    const subscriptionSavings = oneTimeCost * 0.15; // 15% savings assumption

    return {
      total_deliveries: totalDeliveries,
      on_time_rate: Math.round(onTimeRate * 100) / 100,
      average_cost: averageCost,
      next_delivery: subscription.nextDeliveryDate?.toISOString(),
      savings_vs_one_time: Math.round(subscriptionSavings * 100) / 100,
    };
  }
}
