import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Order,
  OrderStatus,
  OrderSchedule,
  PaymentMethod,
  PaymentStatus,
} from '../common/interfaces/order.interface';
import { CreateOrderDto, OrderResponseDto } from '../common/dto/order.dto';
import { ProductService } from '../product/product.service';
import { UserService } from '../modules/user/services/user.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly orders = new Map<string, Order>();
  private readonly userOrderIndex = new Map<string, string[]>(); // userId -> orderIds
  private readonly vendorOrderIndex = new Map<string, string[]>(); // vendorId -> orderIds

  constructor(
    private readonly productService: ProductService,
    private readonly userService: UserService,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    try {
      // Validate product exists and is available
      const product = await this.productService.findById(
        createOrderDto.product_id,
      );
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestException('Product is not available');
      }

      if (product.stockQuantity < createOrderDto.quantity) {
        throw new BadRequestException('Insufficient stock available');
      }

      // Get user details
      const userProfile = await this.userService.getUserProfile(userId);
      if (!userProfile) {
        throw new NotFoundException('User not found');
      }

      // Calculate pricing
      const itemTotal = product.price * createOrderDto.quantity;
      const depositAmount = product.hasDeposit
        ? product.depositAmount * createOrderDto.quantity
        : 0;
      const deliveryFee = this.calculateDeliveryFee(product.vendorId.toString());
      const totalAmount = itemTotal + depositAmount + deliveryFee;

      // Validate payment method and balance
      if (createOrderDto.payment_method === PaymentMethod.WALLET) {
        if (userProfile.walletBalance < totalAmount) {
          throw new BadRequestException(
            `Insufficient wallet balance. Order total is ₹${totalAmount} (₹${itemTotal} + ₹${depositAmount} deposit + ₹${deliveryFee} delivery), but your wallet balance is ₹${userProfile.walletBalance}. Please add money to your wallet or choose a different payment method.`,
          );
        }
      }

      // Create order
      const order: Order = {
        id: uuidv4(),
        userId,
        vendorId: product.vendorId.toString(),
        productId: createOrderDto.product_id,
        quantity: createOrderDto.quantity,
        totalAmount,
        depositAmount,
        deliveryFee,
        status: OrderStatus.PENDING,
        schedule: createOrderDto.schedule,
        deliveryTime: createOrderDto.delivery_time
          ? new Date(createOrderDto.delivery_time)
          : undefined,
        paymentMethod: createOrderDto.payment_method,
        paymentStatus: PaymentStatus.PENDING,
        deliveryAddress:
          createOrderDto.delivery_address ||
          this.getDefaultAddress(userProfile),
        specialInstructions: createOrderDto.special_instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Process payment
      await this.processPayment(order);

      // Update product stock
      await this.productService.updateStock(
        product.id,
        -createOrderDto.quantity,
      );

      // Update user wallet if wallet payment
      if (createOrderDto.payment_method === PaymentMethod.WALLET) {
        await this.userService.updateWalletBalance(userId, -totalAmount);
      }

      // Store order
      this.orders.set(order.id, order);

      // Update indexes
      const userOrders = this.userOrderIndex.get(userId) || [];
      userOrders.push(order.id);
      this.userOrderIndex.set(userId, userOrders);

      const vendorOrders = this.vendorOrderIndex.get(product.vendorId.toString()) || [];
      vendorOrders.push(order.id);
      this.vendorOrderIndex.set(product.vendorId.toString(), vendorOrders);

      this.logger.log(`Created order ${order.id} for user ${userId}`);

      return this.mapToResponseDto(order);
    } catch (error) {
      this.logger.error(`Failed to create order for user ${userId}:`, error);
      throw error;
    }
  }

  async findByUser(userId: string): Promise<OrderResponseDto[]> {
    const orderIds = this.userOrderIndex.get(userId) || [];
    const orders = orderIds
      .map((id) => this.orders.get(id))
      .filter(Boolean) as Order[];

    // Sort by creation date (newest first)
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return orders.map((order) => this.mapToResponseDto(order));
  }

  async findByVendor(vendorId: string): Promise<OrderResponseDto[]> {
    const orderIds = this.vendorOrderIndex.get(vendorId) || [];
    const orders = orderIds
      .map((id) => this.orders.get(id))
      .filter(Boolean) as Order[];

    // Sort by creation date (newest first)
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return orders.map((order) => this.mapToResponseDto(order));
  }

  async findById(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot cancel this order');
    }

    // Update order status
    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();

    // Refund payment if already processed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      await this.processRefund(order);
    }

    // Restore product stock
    await this.productService.updateStock(order.productId, order.quantity);

    this.orders.set(orderId, order);
    this.logger.log(`Cancelled order ${orderId} for user ${userId}`);

    return this.mapToResponseDto(order);
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string,
  ): Promise<OrderResponseDto> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status;
    order.updatedAt = new Date();

    // Initialize tracking info if not exists
    if (!order.trackingInfo) {
      order.trackingInfo = {
        orderId,
        currentStatus: status,
        statusHistory: [],
      };
    }

    // Add to status history
    order.trackingInfo.statusHistory.push({
      status,
      timestamp: new Date(),
      notes,
      updatedBy: 'system', // In real app, this would be the agent/vendor ID
    });

    order.trackingInfo.currentStatus = status;

    // If order is delivered and user has monthly payment mode enabled, create ledger entry
    if (status === OrderStatus.DELIVERED) {
      try {
        const userProfile = await this.userService.getUserProfile(order.userId);
        if (userProfile && userProfile.monthlyPaymentMode) {
          const deliveryDate = new Date();
          await this.ledgerService.createLedgerEntry({
            vendorId: order.vendorId,
            orderId: order.id,
            userId: order.userId,
            amount: order.totalAmount,
            type: 'sale' as any, // LedgerEntryType.SALE
            description: `Order delivery - ${order.quantity} items`,
          });
          this.logger.log(
            `Created monthly ledger entry for delivered order ${orderId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create monthly ledger entry for order ${orderId}:`,
          error,
        );
        // Don't fail the order status update if ledger creation fails
      }
    }

    this.orders.set(orderId, order);
    this.logger.log(`Updated order ${orderId} status to ${status}`);

    return this.mapToResponseDto(order);
  }

  private async processPayment(order: Order): Promise<void> {
    // Simulate payment processing
    switch (order.paymentMethod) {
      case PaymentMethod.WALLET:
        order.paymentStatus = PaymentStatus.COMPLETED;
        break;
      case PaymentMethod.COD:
        order.paymentStatus = PaymentStatus.PENDING;
        break;
      case PaymentMethod.UPI:
      case PaymentMethod.CARD:
        // In real implementation, integrate with payment gateway
        order.paymentStatus = PaymentStatus.COMPLETED;
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      order.status = OrderStatus.CONFIRMED;
    }
  }

  private async processRefund(order: Order): Promise<void> {
    if (order.paymentMethod === PaymentMethod.WALLET) {
      await this.userService.updateWalletBalance(
        order.userId,
        order.totalAmount,
      );
    }
    order.paymentStatus = PaymentStatus.REFUNDED;
  }

  private calculateDeliveryFee(vendorId: string): number {
    // In real implementation, calculate based on vendor's delivery zones
    return 15; // Default delivery fee
  }

  private getDefaultAddress(userProfile: any): any {
    // Try to find default address from user's addresses
    const defaultAddress = userProfile.addresses?.find(
      (addr: any) => addr.isDefault,
    );
    if (defaultAddress) {
      return {
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        pincode: defaultAddress.pincode,
        latitude: defaultAddress.latitude || 28.6139,
        longitude: defaultAddress.longitude || 77.209,
        contactPhone: userProfile.phone,
      };
    }

    // Return default address if no user address found
    return {
      street: '123 Default Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.209,
      contactPhone: userProfile.phone,
    };
  }

  private mapToResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      vendorId: order.vendorId,
      productId: order.productId,
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      status: order.status,
      schedule: order.schedule,
      deliveryTime: order.deliveryTime,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
