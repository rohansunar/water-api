/**
 * Database Indexing Strategy for Water Jar Delivery Platform
 *
 * This file contains comprehensive indexing strategies for all schemas
 * to ensure optimal query performance and database efficiency.
 */

import { Connection } from 'mongoose';

export class DatabaseIndexStrategy {
  /**
   * Apply all database indexes for optimal performance
   */
  static async applyAllIndexes(connection: Connection): Promise<void> {
    // Logging handled by DatabaseInitService

    try {
      // Apply indexes for each collection
      await this.applyUserIndexes(connection);
      await this.applyAddressIndexes(connection);
      await this.applyVendorStoreIndexes(connection);
      await this.applyVendorAreaIndexes(connection);
      await this.applyProductIndexes(connection);
      await this.applyOrderIndexes(connection);
      await this.applyOrderItemIndexes(connection);
      await this.applyDeliveryTaskIndexes(connection);
      await this.applyPaymentIndexes(connection);
      await this.applyLedgerEntryIndexes(connection);
      await this.applyPayoutIndexes(connection);
      await this.applySubscriptionIndexes(connection);
      await this.applyWalletIndexes(connection);
      await this.applyComplaintIndexes(connection);

      // Success logging handled by DatabaseInitService
    } catch (error) {
      console.error('Error applying database indexes:', error);
      throw error;
    }
  }

  /**
   * User collection indexes
   */
  private static async applyUserIndexes(connection: Connection): Promise<void> {
    const collection = connection.collection('users');

    // Primary indexes
    await collection.createIndex({ phone: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ role: 1 });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ isDeleted: 1 });

    // Address-based indexes
    await collection.createIndex({ 'addresses.pincode': 1 });
    await collection.createIndex({ 'addresses.city': 1 });
    await collection.createIndex({ 'addresses.location': '2dsphere' });

    // Role-specific indexes
    await collection.createIndex({ 'vendorExtension.kycStatus': 1 });
    await collection.createIndex({ 'vendorExtension.rating': -1 });
    await collection.createIndex({ 'agentExtension.status': 1 });
    await collection.createIndex({
      'agentExtension.currentLocation.latitude': 1,
      'agentExtension.currentLocation.longitude': 1,
    });

    // Compound indexes
    await collection.createIndex({ role: 1, isActive: 1 });
    await collection.createIndex({ role: 1, createdAt: -1 });
    await collection.createIndex({ isActive: 1, createdAt: -1 });

    // Text search index
    await collection.createIndex({
      name: 'text',
      email: 'text',
      phone: 'text',
    });
  }

  /**
   * Address collection indexes
   */
  private static async applyAddressIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('addresses');

    // Primary indexes
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ pincode: 1 });
    await collection.createIndex({ city: 1 });
    await collection.createIndex({ state: 1 });
    await collection.createIndex({ location: '2dsphere' });
    await collection.createIndex({ isDefault: 1 });
    await collection.createIndex({ isActive: 1 });

    // Compound indexes
    await collection.createIndex({ userId: 1, isDefault: 1 });
    await collection.createIndex({ userId: 1, isActive: 1 });
    await collection.createIndex({ pincode: 1, city: 1 });
    await collection.createIndex({ userId: 1, label: 1 });
  }

  /**
   * Product collection indexes with text search optimization
   */
  private static async applyProductIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('products');

    // Primary indexes
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ storeId: 1 });
    await collection.createIndex({ sku: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ isAvailable: 1 });
    await collection.createIndex({ price: 1 });
    await collection.createIndex({ rating: -1 });
    await collection.createIndex({ totalOrders: -1 });

    // Area-specific availability
    await collection.createIndex({ areaPincodes: 1 });

    // Compound indexes for common queries
    await collection.createIndex({ vendorId: 1, isAvailable: 1 });
    await collection.createIndex({ vendorId: 1, status: 1 });
    await collection.createIndex({ category: 1, isAvailable: 1 });
    await collection.createIndex({ isAvailable: 1, rating: -1 });
    await collection.createIndex({ areaPincodes: 1, isAvailable: 1 });
    await collection.createIndex({ status: 1, rating: -1 });

    // Text search index for product discovery
    await collection.createIndex(
      {
        name: 'text',
        description: 'text',
        tags: 'text',
        searchKeywords: 'text',
        'specifications.brand': 'text',
      },
      {
        weights: {
          name: 10,
          tags: 5,
          searchKeywords: 5,
          description: 2,
          'specifications.brand': 3,
        },
      },
    );
  }

  /**
   * Order collection indexes with time-based partitioning support
   */
  private static async applyOrderIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('orders');

    // Primary indexes
    await collection.createIndex({ orderUuid: 1 }, { unique: true });
    await collection.createIndex({ customerId: 1 });
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ storeId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ paymentStatus: 1 });
    await collection.createIndex({ orderType: 1 });
    await collection.createIndex({ subscriptionId: 1 });

    // Time-based indexes for partitioning
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ slotStart: 1 });
    await collection.createIndex({ estimatedDeliveryTime: 1 });

    // Compound indexes for common queries
    await collection.createIndex({ customerId: 1, status: 1 });
    await collection.createIndex({ vendorId: 1, status: 1 });
    await collection.createIndex({ vendorId: 1, createdAt: -1 });
    await collection.createIndex({ customerId: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, createdAt: -1 });
    await collection.createIndex({ orderType: 1, status: 1 });

    // Performance indexes for analytics
    await collection.createIndex({ createdAt: -1, totalAmount: 1 });
    await collection.createIndex({
      vendorId: 1,
      createdAt: -1,
      totalAmount: 1,
    });
  }

  /**
   * Delivery task indexes with geospatial optimization
   */
  private static async applyDeliveryTaskIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('delivery_tasks');

    // Primary indexes
    await collection.createIndex({ orderId: 1 });
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ storeId: 1 });
    await collection.createIndex({ driverId: 1 });
    await collection.createIndex({ customerId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ priority: 1 });

    // Geospatial indexes for location-based queries
    await collection.createIndex({ pickupLocation: '2dsphere' });
    await collection.createIndex({ deliveryLocation: '2dsphere' });

    // Time-based indexes
    await collection.createIndex({ estimatedDeliveryTime: 1 });
    await collection.createIndex({ createdAt: -1 });

    // Compound indexes for driver assignment and tracking
    await collection.createIndex({ driverId: 1, status: 1 });
    await collection.createIndex({ vendorId: 1, status: 1 });
    await collection.createIndex({ status: 1, priority: -1 });
    await collection.createIndex({ status: 1, estimatedDeliveryTime: 1 });
    await collection.createIndex({ driverId: 1, createdAt: -1 });
  }

  /**
   * Payment collection indexes for financial tracking
   */
  private static async applyPaymentIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('payments');

    // Primary indexes
    await collection.createIndex({ orderId: 1 });
    await collection.createIndex({ userId: 1 });
    await collection.createIndex(
      { transactionId: 1 },
      { unique: true, sparse: true },
    );
    await collection.createIndex({ gatewayTransactionId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ method: 1 });
    await collection.createIndex({ provider: 1 });

    // Time-based indexes
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ completedAt: -1 });

    // Compound indexes for financial reporting
    await collection.createIndex({ userId: 1, status: 1 });
    await collection.createIndex({ orderId: 1, status: 1 });
    await collection.createIndex({ status: 1, createdAt: -1 });
    await collection.createIndex({ provider: 1, status: 1 });
    await collection.createIndex({ method: 1, status: 1 });
  }

  /**
   * Subscription collection indexes for recurring orders
   */
  private static async applySubscriptionIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('subscriptions');

    // Primary indexes
    await collection.createIndex({ customerId: 1 });
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ productId: 1 });
    await collection.createIndex({ storeId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ frequency: 1 });

    // Delivery scheduling indexes
    await collection.createIndex({ nextDeliveryDate: 1 });
    await collection.createIndex({ startDate: 1 });
    await collection.createIndex({ endDate: 1 });

    // Compound indexes for subscription management
    await collection.createIndex({ customerId: 1, status: 1 });
    await collection.createIndex({ vendorId: 1, status: 1 });
    await collection.createIndex({ status: 1, nextDeliveryDate: 1 });
    await collection.createIndex({ customerId: 1, createdAt: -1 });
    await collection.createIndex({ vendorId: 1, createdAt: -1 });
  }

  /**
   * Wallet and transaction indexes for financial operations
   */
  private static async applyWalletIndexes(
    connection: Connection,
  ): Promise<void> {
    // Wallet indexes
    const walletCollection = connection.collection('wallets');
    await walletCollection.createIndex({ userId: 1 }, { unique: true });
    await walletCollection.createIndex({ isActive: 1 });
    await walletCollection.createIndex({ isBlocked: 1 });
    await walletCollection.createIndex({ balance: 1 });

    // Wallet transaction indexes
    const transactionCollection = connection.collection('wallet_transactions');
    await transactionCollection.createIndex({ walletId: 1 });
    await transactionCollection.createIndex({ userId: 1 });
    await transactionCollection.createIndex({ type: 1 });
    await transactionCollection.createIndex({ status: 1 });
    await transactionCollection.createIndex({ referenceId: 1 });
    await transactionCollection.createIndex({ referenceType: 1 });
    await transactionCollection.createIndex({ createdAt: -1 });

    // Compound indexes
    await transactionCollection.createIndex({ userId: 1, type: 1 });
    await transactionCollection.createIndex({ userId: 1, createdAt: -1 });
    await transactionCollection.createIndex({ walletId: 1, createdAt: -1 });
  }

  /**
   * Apply remaining collection indexes
   */
  private static async applyVendorStoreIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('vendor_stores');
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ rating: -1 });
    await collection.createIndex({ vendorId: 1, isActive: 1 });
  }

  private static async applyVendorAreaIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('vendor_areas');
    await collection.createIndex({ storeId: 1 });
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ pincode: 1 });
    await collection.createIndex({ polygon: '2dsphere' });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ priority: -1 });
  }

  private static async applyOrderItemIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('order_items');
    await collection.createIndex({ orderId: 1 });
    await collection.createIndex({ productId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ orderId: 1, status: 1 });
  }

  private static async applyLedgerEntryIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('ledger_entries');
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ month: 1, year: 1 });
    await collection.createIndex({ settlementStatus: 1 });
    await collection.createIndex({ vendorId: 1, month: 1, year: 1 });
  }

  private static async applyPayoutIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('payouts');
    await collection.createIndex({ vendorId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ month: 1, year: 1 });
    await collection.createIndex({ vendorId: 1, status: 1 });
  }

  private static async applyComplaintIndexes(
    connection: Connection,
  ): Promise<void> {
    const collection = connection.collection('complaints');
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ priority: 1 });
    await collection.createIndex({ assignedTo: 1 });
    await collection.createIndex({ status: 1, priority: -1 });

    const responseCollection = connection.collection('complaint_responses');
    await responseCollection.createIndex({ complaintId: 1 });
    await responseCollection.createIndex({ complaintId: 1, createdAt: -1 });
  }
}
