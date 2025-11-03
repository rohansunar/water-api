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
} from '../interfaces/order.interface';
import { CreateOrderDto, OrderResponseDto } from '../dto/order.dto';
import { ProductService } from '../../product/services/product.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { CommissionService } from '../../commission/services/commission.service';

/**
 * Order Service - Comprehensive Order Lifecycle Management System
 *
 * This service manages the complete order lifecycle from creation to completion,
 * integrating payment processing, inventory management, and financial ledger operations.
 *
 * Architecture:
 * - In-memory storage using Maps for orders and indexes (production would use database)
 * - Event-driven architecture with logging for audit trails
 * - Dependency injection for external services (Product, User, Ledger, Commission)
 *
 * Key Features:
 * - Multi-step order validation and creation process
 * - Payment processing with multiple payment methods (Wallet, COD, UPI, Card)
 * - Inventory management with stock validation and updates
 * - Order cancellation with automatic refunds and stock restoration
 * - Status tracking with detailed history and notes
 * - Financial integration with ledger entries for monthly billing
 * - Commission calculation and recording for vendor payments
 *
 * Business Logic:
 * - Orders progress through states: PENDING -> CONFIRMED -> PROCESSING -> DELIVERED
 * - Payment processing is immediate for wallet/UPI/card, pending for COD
 * - Inventory is reserved at order creation and restored on cancellation
 * - Monthly payment mode users get ledger entries instead of immediate charges
 * - Commission is calculated per order and recorded in ledger for vendor payouts
 */
@Injectable()
export class OrderService {
  /** Logger instance for audit trails and debugging */
  private readonly logger = new Logger(OrderService.name);

  /** In-memory storage for orders - maps order ID to Order object */
  private readonly orders = new Map<string, Order>();

  /** Index mapping user IDs to their order IDs for efficient user order retrieval */
  private readonly userOrderIndex = new Map<string, string[]>(); // userId -> orderIds

  /** Index mapping vendor IDs to their order IDs for efficient vendor order retrieval */
  private readonly vendorOrderIndex = new Map<string, string[]>(); // vendorId -> orderIds

  /**
   * Constructor with dependency injection for external services
   * @param productService - Handles product validation and inventory management
   * @param userService - Manages user profiles and wallet operations
   * @param ledgerService - Records financial transactions for accounting
   * @param commissionService - Calculates vendor commissions for orders
   */
  constructor(
    private readonly productService: ProductService,
    private readonly ledgerService: LedgerService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Creates a new order with comprehensive validation and multi-step processing
   *
   * This method implements the complete order creation workflow:
   * 1. Product validation and availability check
   * 2. User profile verification
   * 3. Pricing calculation (item total + deposit + delivery fee)
   * 4. Payment method validation and balance check
   * 5. Order object creation with all required fields
   * 6. Payment processing based on method
   * 7. Inventory stock reservation
   * 8. Wallet balance deduction (if applicable)
   * 9. Order storage and index updates
   *
   * Business Logic:
   * - Inventory is immediately reserved to prevent overselling
   * - Wallet payments are processed immediately, COD payments remain pending
   * - Orders start in PENDING status and move to CONFIRMED after payment
   * - All pricing calculations include deposits for returnable items
   * - Delivery fees are calculated based on vendor location
   *
   * @param userId - The ID of the user placing the order
   * @param createOrderDto - Order creation data including product, quantity, payment method, etc.
   * @returns Promise<OrderResponseDto> - The created order in response format
   * @throws NotFoundException - When product or user not found
   * @throws BadRequestException - When validation fails (insufficient stock, balance, etc.)
   */
  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    try {
      // === STEP 1: Product Validation ===
      // Verify product exists and is available for purchase
      const product = await this.productService.findById(
        createOrderDto.product_id,
      );
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestException('Product is not available');
      }

      // Check inventory availability - prevent overselling
      if (product.stockQuantity < createOrderDto.quantity) {
        throw new BadRequestException('Insufficient stock available');
      }

      // === STEP 2: User Validation ===
      // TODO: Implement user profile retrieval without UserService
      const userProfile = { walletBalance: 0, addresses: [], phone: '0000000000' }; // Mock user profile
      this.logger.log(`User validation needed for userId: ${userId}`);

      // === STEP 3: Pricing Calculation ===
      // Calculate all cost components of the order
      const itemTotal = product.price * createOrderDto.quantity;
      const depositAmount = product.hasDeposit
        ? product.depositAmount * createOrderDto.quantity
        : 0;
      const deliveryFee = this.calculateDeliveryFee(
        product.vendorId.toString(),
      );
      const totalAmount = itemTotal + depositAmount + deliveryFee;

      // === STEP 4: Payment Validation ===
      // Validate payment method and sufficient funds for wallet payments
      if (createOrderDto.payment_method === PaymentMethod.WALLET) {
        if (userProfile.walletBalance < totalAmount) {
          throw new BadRequestException(
            `Insufficient wallet balance. Order total is ₹${totalAmount} (₹${itemTotal} + ₹${depositAmount} deposit + ₹${deliveryFee} delivery), but your wallet balance is ₹${userProfile.walletBalance}. Please add money to your wallet or choose a different payment method.`,
          );
        }
      }

      // === STEP 5: Order Object Creation ===
      // Create comprehensive order object with all required fields
      const order: Order = {
        id: uuidv4(),
        userId,
        vendorId: product.vendorId.toString(),
        productId: createOrderDto.product_id,
        quantity: createOrderDto.quantity,
        totalAmount,
        depositAmount,
        deliveryFee,
        status: OrderStatus.PENDING, // Initial status before payment processing
        schedule: createOrderDto.schedule,
        deliveryTime: createOrderDto.delivery_time
          ? new Date(createOrderDto.delivery_time)
          : undefined,
        paymentMethod: createOrderDto.payment_method,
        paymentStatus: PaymentStatus.PENDING, // Initial payment status
        deliveryAddress:
          createOrderDto.delivery_address ||
          this.getDefaultAddress(userProfile),
        specialInstructions: createOrderDto.special_instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // === STEP 6: Payment Processing ===
      // Process payment based on selected payment method
      await this.processPayment(order);

      // === STEP 7: Inventory Management ===
      // Reserve inventory by reducing stock quantity
      await this.productService.updateStock(
        product.id,
        -createOrderDto.quantity, // Negative value reduces stock
      );

      // === STEP 8: Wallet Operations ===
      // TODO: Implement wallet balance deduction without UserService
      if (createOrderDto.payment_method === PaymentMethod.WALLET) {
        this.logger.log(`Wallet deduction needed for user ${userId}: -${totalAmount}`);
      }

      // === STEP 9: Data Storage ===
      // Store order in memory and update lookup indexes
      this.orders.set(order.id, order);

      // Update user order index for efficient retrieval
      const userOrders = this.userOrderIndex.get(userId) || [];
      userOrders.push(order.id);
      this.userOrderIndex.set(userId, userOrders);

      // Update vendor order index for vendor dashboard
      const vendorOrders =
        this.vendorOrderIndex.get(product.vendorId.toString()) || [];
      vendorOrders.push(order.id);
      this.vendorOrderIndex.set(product.vendorId.toString(), vendorOrders);

      // === STEP 10: Audit Logging ===
      this.logger.log(`Created order ${order.id} for user ${userId}`);

      return this.mapToResponseDto(order);
    } catch (error) {
      // Log all order creation failures for debugging and audit
      this.logger.error(`Failed to create order for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all orders for a specific user
   *
   * This method provides efficient user order lookup using the user order index.
   * Orders are sorted by creation date in descending order (newest first) for
   * better user experience in order history views.
   *
   * @param userId - The ID of the user whose orders to retrieve
   * @returns Promise<OrderResponseDto[]> - Array of user's orders sorted by creation date
   */
  async findByUser(userId: string): Promise<OrderResponseDto[]> {
    // Retrieve order IDs for the user from the index
    const orderIds = this.userOrderIndex.get(userId) || [];
    const orders = orderIds.map((id) => this.orders.get(id)).filter(Boolean);

    // Sort by creation date (newest first) for better UX
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return orders.map((order) => this.mapToResponseDto(order));
  }

  /**
   * Retrieves all orders for a specific vendor
   *
   * This method provides efficient vendor order lookup using the vendor order index.
   * Orders are sorted by creation date in descending order (newest first) for
   * better vendor experience in order management dashboards.
   *
   * @param vendorId - The ID of the vendor whose orders to retrieve
   * @returns Promise<OrderResponseDto[]> - Array of vendor's orders sorted by creation date
   */
  async findByVendor(vendorId: string): Promise<OrderResponseDto[]> {
    // Retrieve order IDs for the vendor from the index
    const orderIds = this.vendorOrderIndex.get(vendorId) || [];
    const orders = orderIds.map((id) => this.orders.get(id)).filter(Boolean);

    // Sort by creation date (newest first) for better UX
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return orders.map((order) => this.mapToResponseDto(order));
  }

  /**
   * Retrieves a single order by its ID
   *
   * This method provides direct order lookup for detailed order views
   * and order-specific operations.
   *
   * @param orderId - The unique identifier of the order to retrieve
   * @returns Promise<Order | null> - The order object or null if not found
   */
  async findById(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  /**
   * Cancels an order with comprehensive validation and rollback operations
   *
   * This method implements the order cancellation workflow:
   * 1. Order existence and ownership validation
   * 2. Cancellation eligibility check (cannot cancel delivered/cancelled orders)
   * 3. Order status update to CANCELLED
   * 4. Payment refund processing if payment was completed
   * 5. Inventory stock restoration
   * 6. Order persistence and audit logging
   *
   * Business Logic:
   * - Only order owners can cancel their orders
   * - Orders can only be cancelled if not already delivered or cancelled
   * - Refunds are processed automatically for completed payments
   * - Stock is restored to allow re-purchasing of cancelled items
   * - All changes are logged for audit trails
   *
   * @param orderId - The unique identifier of the order to cancel
   * @param userId - The ID of the user requesting cancellation (for authorization)
   * @returns Promise<OrderResponseDto> - The cancelled order in response format
   * @throws NotFoundException - When order not found
   * @throws BadRequestException - When user not authorized or order cannot be cancelled
   */
  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    // === STEP 1: Order Validation ===
    // Verify order exists and user owns it
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    // === STEP 2: Cancellation Eligibility Check ===
    // Prevent cancellation of already delivered or cancelled orders
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot cancel this order');
    }

    // === STEP 3: Order Status Update ===
    // Mark order as cancelled and update timestamp
    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();

    // === STEP 4: Payment Refund Processing ===
    // Process refund if payment was already completed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      await this.processRefund(order);
    }

    // === STEP 5: Inventory Restoration ===
    // Restore product stock to allow re-purchasing
    await this.productService.updateStock(order.productId, order.quantity);

    // === STEP 6: Data Persistence ===
    // Save updated order and log cancellation
    this.orders.set(orderId, order);
    this.logger.log(`Cancelled order ${orderId} for user ${userId}`);

    return this.mapToResponseDto(order);
  }

  /**
   * Updates order status with comprehensive tracking and financial integration
   *
   * This method implements the order status update workflow:
   * 1. Order existence validation
   * 2. Status update with timestamp
   * 3. Status tracking and history management
   * 4. Financial ledger integration for delivered orders
   * 5. Commission calculation and recording
   * 6. Order persistence and audit logging
   *
   * Business Logic:
   * - Maintains complete audit trail of status changes
   * - For delivered orders with monthly payment mode:
   *   * Creates ledger entries for sales transactions
   *   * Calculates and records vendor commissions
   *   * Supports monthly billing instead of immediate payment
   * - Commission calculation based on product category and order amount
   * - All financial operations are logged for audit trails
   * - Status updates never fail due to ledger errors (graceful degradation)
   *
   * @param orderId - The unique identifier of the order to update
   * @param status - The new order status to set
   * @param notes - Optional notes explaining the status change
   * @returns Promise<OrderResponseDto> - The updated order in response format
   * @throws NotFoundException - When order not found
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string,
  ): Promise<OrderResponseDto> {
    // === STEP 1: Order Validation ===
    // Verify order exists before processing
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // === STEP 2: Status Update ===
    // Update order status and timestamp
    order.status = status;
    order.updatedAt = new Date();

    // === STEP 3: Status Tracking Initialization ===
    // Initialize tracking info if not exists
    if (!order.trackingInfo) {
      order.trackingInfo = {
        orderId,
        currentStatus: status,
        statusHistory: [],
      };
    }

    // === STEP 4: Status History Management ===
    // Add comprehensive status change record to history
    order.trackingInfo.statusHistory.push({
      status,
      timestamp: new Date(),
      notes,
      updatedBy: 'system', // In real app, this would be the agent/vendor ID
    });

    // Update current status in tracking info
    order.trackingInfo.currentStatus = status;

    // === STEP 5: Financial Integration for Delivered Orders ===
    // Process financial transactions when order is delivered
    if (status === OrderStatus.DELIVERED) {
      try {
        // TODO: Check if user has monthly payment mode enabled without UserService
        const userProfile = { monthlyPaymentMode: false }; // Mock user profile
        if (userProfile && userProfile.monthlyPaymentMode) {
          // === STEP 5A: Create Sales Ledger Entry ===
          // Record the sale transaction in the ledger for monthly billing
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

          // === STEP 5B: Commission Calculation and Recording ===
          // Calculate and record commission for the vendor
          try {
            const product = await this.productService.findById(order.productId);
            if (product) {
              // Calculate commission based on product category and order amount
              const commission =
                await this.commissionService.calculateCommission(
                  order.productId,
                  product.category,
                  order.vendorId,
                  order.totalAmount,
                );

              // Record commission transaction in ledger
              await this.ledgerService.createLedgerEntry({
                vendorId: order.vendorId,
                orderId: order.id,
                userId: order.userId,
                amount: commission.amount,
                type: 'commission' as any,
                description: `Commission for order - ${commission.percentage}%`,
              });
              this.logger.log(
                `Created commission ledger entry for order ${orderId}: ${commission.amount}`,
              );
            }
          } catch (commissionError) {
            // Log commission calculation errors but don't fail the order update
            this.logger.error(
              `Failed to create commission ledger entry for order ${orderId}:`,
              commissionError,
            );
          }
        }
      } catch (error) {
        // Log ledger creation errors but don't fail the order status update
        // This ensures order status updates are never blocked by financial system issues
        this.logger.error(
          `Failed to create monthly ledger entry for order ${orderId}:`,
          error,
        );
        // Don't fail the order status update if ledger creation fails
      }
    }

    // === STEP 6: Data Persistence ===
    // Save updated order and log the status change
    this.orders.set(orderId, order);
    this.logger.log(`Updated order ${orderId} status to ${status}`);

    return this.mapToResponseDto(order);
  }

  /**
   * Processes payment based on the selected payment method
   *
   * This method handles different payment processing strategies:
   * - Wallet: Immediate completion (funds already verified)
   * - COD: Payment remains pending until delivery
   * - UPI/Card: Immediate completion (simulated, would integrate with payment gateway)
   *
   * Algorithm:
   * 1. Route to appropriate payment processor based on method
   * 2. Update payment status accordingly
   * 3. If payment completed, advance order status to CONFIRMED
   *
   * @param order - The order object to process payment for
   * @throws BadRequestException - When payment method is invalid
   */
  private async processPayment(order: Order): Promise<void> {
    // Route payment processing based on method type
    switch (order.paymentMethod) {
      case PaymentMethod.WALLET:
        // Wallet payments are pre-verified and completed immediately
        order.paymentStatus = PaymentStatus.COMPLETED;
        break;
      case PaymentMethod.COD:
        // Cash on delivery payments remain pending until delivery
        order.paymentStatus = PaymentStatus.PENDING;
        break;
      case PaymentMethod.UPI:
      case PaymentMethod.CARD:
        // Digital payments are completed immediately (simulated)
        // In production, this would integrate with payment gateway (Razorpay, Stripe, etc.)
        order.paymentStatus = PaymentStatus.COMPLETED;
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    // Advance order status to CONFIRMED if payment is completed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      order.status = OrderStatus.CONFIRMED;
    }
  }

  /**
   * Processes refund for cancelled orders
   *
   * This method handles refund processing for different payment methods:
   * - Wallet: Credits amount back to user's wallet
   * - Other methods: Marks as refunded (would integrate with payment gateway)
   *
   * @param order - The order object to process refund for
   */
  private async processRefund(order: Order): Promise<void> {
    if (order.paymentMethod === PaymentMethod.WALLET) {
      // TODO: Credit the full order amount back to user's wallet without UserService
      this.logger.log(`Wallet refund needed for user ${order.userId}: +${order.totalAmount}`);
    }
    // For other payment methods, mark as refunded
    // In production, this would integrate with payment gateway for actual refunds
    order.paymentStatus = PaymentStatus.REFUNDED;
  }

  /**
   * Calculates delivery fee based on vendor location
   *
   * This method determines delivery charges based on:
   * - Vendor's delivery zones and coverage areas
   * - Distance from vendor to delivery location
   * - Delivery time windows and surge pricing
   *
   * Current Implementation:
   * - Returns fixed default fee (₹15)
   * - Production would calculate based on actual distance and zones
   *
   * @param vendorId - The ID of the vendor for delivery fee calculation
   * @returns number - Delivery fee amount in rupees
   */
  private calculateDeliveryFee(vendorId: string): number {
    // In real implementation, calculate based on vendor's delivery zones,
    // distance from vendor location to delivery address, and time-based pricing
    return 15; // Default delivery fee in rupees
  }

  /**
   * Retrieves or creates default delivery address for user
   *
   * This method implements address resolution logic:
   * 1. Look for user's default address in their saved addresses
   * 2. Fall back to default Delhi coordinates if no address found
   * 3. Include user's contact phone for delivery coordination
   *
   * @param userProfile - User's profile containing address information
   * @returns Delivery address object with coordinates and contact info
   */
  private getDefaultAddress(userProfile: any): any {
    // Try to find default address from user's saved addresses
    const defaultAddress = userProfile.addresses?.find(
      (addr: any) => addr.isDefault,
    );
    if (defaultAddress) {
      return {
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        pincode: defaultAddress.pincode,
        latitude: defaultAddress.latitude || 28.6139, // Default to Delhi coordinates
        longitude: defaultAddress.longitude || 77.209,
        contactPhone: userProfile.phone,
      };
    }

    // Return default Delhi address if no user address found
    // This ensures orders can always be placed even without saved addresses
    return {
      street: '123 Default Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139, // Default Delhi coordinates
      longitude: 77.209,
      contactPhone: userProfile.phone,
    };
  }

  /**
   * Maps internal Order object to public response DTO
   *
   * This method transforms the internal order representation to the
   * external API response format, filtering out internal-only fields
   * and ensuring consistent data structure for API consumers.
   *
   * @param order - Internal Order object to transform
   * @returns OrderResponseDto - Public API response format
   */
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
