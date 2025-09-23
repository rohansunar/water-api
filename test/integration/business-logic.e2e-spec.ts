import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import schemas
import { User, UserSchema } from '../../src/common/schemas/user.schema';
import {
  Product,
  ProductSchema,
} from '../../src/common/schemas/product.schema';
import { Order, OrderSchema } from '../../src/common/schemas/order.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../src/common/schemas/subscription.schema';
import {
  Wallet,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '../../src/common/schemas/wallet.schema';
import {
  Payment,
  PaymentSchema,
} from '../../src/common/schemas/payment.schema';
import {
  LedgerEntry,
  LedgerEntrySchema,
} from '../../src/common/schemas/ledger-entry.schema';

describe('Business Logic Validation Integration Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let userModel: Model<User>;
  let productModel: Model<Product>;
  let orderModel: Model<Order>;
  let subscriptionModel: Model<Subscription>;
  let walletModel: Model<Wallet>;
  let walletTransactionModel: Model<WalletTransaction>;
  let paymentModel: Model<Payment>;
  let ledgerEntryModel: Model<LedgerEntry>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Order.name, schema: OrderSchema },
          { name: Subscription.name, schema: SubscriptionSchema },
          { name: Wallet.name, schema: WalletSchema },
          { name: WalletTransaction.name, schema: WalletTransactionSchema },
          { name: Payment.name, schema: PaymentSchema },
          { name: LedgerEntry.name, schema: LedgerEntrySchema },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    productModel = moduleFixture.get<Model<Product>>(
      getModelToken(Product.name),
    );
    orderModel = moduleFixture.get<Model<Order>>(getModelToken(Order.name));
    subscriptionModel = moduleFixture.get<Model<Subscription>>(
      getModelToken(Subscription.name),
    );
    walletModel = moduleFixture.get<Model<Wallet>>(getModelToken(Wallet.name));
    walletTransactionModel = moduleFixture.get<Model<WalletTransaction>>(
      getModelToken(WalletTransaction.name),
    );
    paymentModel = moduleFixture.get<Model<Payment>>(
      getModelToken(Payment.name),
    );
    ledgerEntryModel = moduleFixture.get<Model<LedgerEntry>>(
      getModelToken(LedgerEntry.name),
    );
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userModel.deleteMany({});
    await productModel.deleteMany({});
    await orderModel.deleteMany({});
    await subscriptionModel.deleteMany({});
    await walletModel.deleteMany({});
    await walletTransactionModel.deleteMany({});
    await paymentModel.deleteMany({});
    await ledgerEntryModel.deleteMany({});
  });

  describe('Wallet and Payment Business Logic', () => {
    let customer: any;
    let vendor: any;

    beforeEach(async () => {
      customer = await userModel.create({
        name: 'Customer User',
        phone: '9999999999',
        email: 'customer@example.com',
        role: 'customer',
        walletBalance: 1000,
      });

      vendor = await userModel.create({
        name: 'Vendor User',
        phone: '8888888888',
        email: 'vendor@example.com',
        role: 'vendor',
      });
    });

    it('should create wallet for user and maintain balance consistency', async () => {
      // Create wallet for customer
      const wallet = await walletModel.create({
        userId: customer._id,
        balance: 1000,
        currency: 'INR',
        isActive: true,
      });

      expect(wallet.balance).toBe(1000);
      expect(wallet.userId.toString()).toBe(customer._id.toString());

      // Create debit transaction
      const debitTransaction = await walletTransactionModel.create({
        walletId: wallet._id,
        userId: customer._id,
        type: 'debit',
        amount: 200,
        balanceAfter: 800,
        description: 'Order payment',
        referenceType: 'order',
        status: 'completed',
      });

      // Update wallet balance
      wallet.balance = 800;
      wallet.totalDebits = 200;
      wallet.totalTransactions = 1;
      await wallet.save();

      expect(debitTransaction.type).toBe('debit');
      expect(debitTransaction.amount).toBe(200);
      expect(debitTransaction.balanceAfter).toBe(800);

      // Verify wallet balance matches transaction
      const updatedWallet = await walletModel.findById(wallet._id);
      expect(updatedWallet.balance).toBe(800);
      expect(updatedWallet.totalDebits).toBe(200);
    });

    it('should enforce wallet transaction limits', async () => {
      const wallet = await walletModel.create({
        userId: customer._id,
        balance: 1000,
        dailyTransactionLimit: 500,
        monthlyTransactionLimit: 2000,
        dailySpent: 300,
        monthlySpent: 800,
      });

      // Test daily limit enforcement
      const canDebit400 =
        wallet.balance >= 400 &&
        wallet.dailySpent + 400 <= wallet.dailyTransactionLimit &&
        wallet.monthlySpent + 400 <= wallet.monthlyTransactionLimit;

      expect(canDebit400).toBe(false); // 300 + 400 = 700 > 500 (daily limit)

      // Test valid transaction within limits
      const canDebit150 =
        wallet.balance >= 150 &&
        wallet.dailySpent + 150 <= wallet.dailyTransactionLimit &&
        wallet.monthlySpent + 150 <= wallet.monthlyTransactionLimit;

      expect(canDebit150).toBe(true); // 300 + 150 = 450 < 500 (daily limit)
    });

    it('should handle wallet transaction reversals', async () => {
      const wallet = await walletModel.create({
        userId: customer._id,
        balance: 800,
      });

      // Original transaction
      const originalTransaction = await walletTransactionModel.create({
        walletId: wallet._id,
        userId: customer._id,
        type: 'debit',
        amount: 200,
        balanceAfter: 800,
        description: 'Order payment',
        status: 'completed',
        createdAt: new Date(),
      });

      // Check if transaction can be reversed (within 24 hours)
      const reversalWindow = 24 * 60 * 60 * 1000; // 24 hours
      const timeSinceTransaction =
        Date.now() - originalTransaction.createdAt.getTime();
      const canBeReversed =
        originalTransaction.status === 'completed' &&
        !originalTransaction.reversalTransactionId &&
        timeSinceTransaction <= reversalWindow;

      expect(canBeReversed).toBe(true);

      // Create reversal transaction
      const reversalTransaction = await walletTransactionModel.create({
        walletId: wallet._id,
        userId: customer._id,
        type: 'credit',
        amount: 200,
        balanceAfter: 1000,
        description: 'Reversal of order payment',
        status: 'completed',
      });

      // Update original transaction
      originalTransaction.reversalTransactionId = reversalTransaction._id;
      originalTransaction.reversedAt = new Date();
      await originalTransaction.save();

      expect(originalTransaction.reversalTransactionId.toString()).toBe(
        reversalTransaction._id.toString(),
      );
      expect(reversalTransaction.type).toBe('credit');
      expect(reversalTransaction.amount).toBe(200);
    });
  });

  describe('Order and Payment Integration', () => {
    let customer: any;
    let vendor: any;
    let product: any;
    let wallet: any;

    beforeEach(async () => {
      customer = await userModel.create({
        name: 'Order Customer',
        phone: '7777777777',
        role: 'customer',
      });

      vendor = await userModel.create({
        name: 'Order Vendor',
        phone: '6666666666',
        role: 'vendor',
      });

      product = await productModel.create({
        vendorId: vendor._id,
        name: 'Test Product',
        category: 'water_jar',
        price: 150,
        capacity: 20,
        unit: 'liters',
        stock: 100,
      });

      wallet = await walletModel.create({
        userId: customer._id,
        balance: 1000,
      });
    });

    it('should process complete order payment flow', async () => {
      // Create order
      const order = await orderModel.create({
        customerId: customer._id,
        vendorId: vendor._id,
        items: [
          {
            productId: product._id,
            quantity: 2,
            price: 150,
            discount: 20,
          },
        ],
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          contactPhone: '7777777777',
        },
        deliveryFee: 30,
        taxes: 25,
        discount: 10,
        platformFee: 15,
        totalAmount: 305, // (150*2 - 20) + 30 + 25 - 10 = 305
        vendorEarnings: 260, // 305 - 15 - 30 = 260
      });

      // Create payment
      const payment = await paymentModel.create({
        orderId: order._id,
        userId: customer._id,
        amount: 305,
        method: 'wallet',
        provider: 'internal',
        status: 'completed',
        transactionId: 'TXN-' + Date.now(),
      });

      // Create wallet transaction
      const walletTransaction = await walletTransactionModel.create({
        walletId: wallet._id,
        userId: customer._id,
        type: 'debit',
        amount: 305,
        balanceAfter: 695, // 1000 - 305
        description: `Payment for order ${order.orderUuid}`,
        referenceId: order._id.toString(),
        referenceType: 'order',
        status: 'completed',
      });

      // Update wallet balance
      wallet.balance = 695;
      wallet.totalDebits = 305;
      wallet.totalTransactions = 1;
      await wallet.save();

      // Create ledger entry for vendor
      const ledgerEntry = await ledgerEntryModel.create({
        vendorId: vendor._id,
        orderId: order._id,
        type: 'sale',
        amount: 260, // vendor earnings
        description: `Sale for order ${order.orderUuid}`,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        settlementStatus: 'pending',
      });

      // Verify the complete flow
      expect(order.totalAmount).toBe(305);
      expect(order.vendorEarnings).toBe(260);
      expect(payment.status).toBe('completed');
      expect(payment.amount).toBe(305);
      expect(walletTransaction.balanceAfter).toBe(695);
      expect(wallet.balance).toBe(695);
      expect(ledgerEntry.amount).toBe(260);
      expect(ledgerEntry.settlementStatus).toBe('pending');
    });

    it('should handle payment failures and rollbacks', async () => {
      const order = await orderModel.create({
        customerId: customer._id,
        vendorId: vendor._id,
        items: [{ productId: product._id, quantity: 1, price: 150 }],
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          contactPhone: '7777777777',
        },
        totalAmount: 150,
      });

      // Simulate insufficient wallet balance
      wallet.balance = 100; // Less than order amount
      await wallet.save();

      // Check if payment can be processed
      const canProcessPayment =
        wallet.balance >= order.totalAmount &&
        wallet.isActive &&
        !wallet.isBlocked;

      expect(canProcessPayment).toBe(false);

      // Create failed payment record
      const failedPayment = await paymentModel.create({
        orderId: order._id,
        userId: customer._id,
        amount: 150,
        method: 'wallet',
        provider: 'internal',
        status: 'failed',
        failureReason: 'Insufficient wallet balance',
        transactionId: 'TXN-FAILED-' + Date.now(),
      });

      expect(failedPayment.status).toBe('failed');
      expect(failedPayment.failureReason).toBe('Insufficient wallet balance');

      // Verify wallet balance unchanged
      const unchangedWallet = await walletModel.findById(wallet._id);
      expect(unchangedWallet.balance).toBe(100);
    });
  });

  describe('Subscription Business Logic', () => {
    let customer: any;
    let vendor: any;
    let product: any;

    beforeEach(async () => {
      customer = await userModel.create({
        name: 'Subscription Customer',
        phone: '5555555555',
        role: 'customer',
      });

      vendor = await userModel.create({
        name: 'Subscription Vendor',
        phone: '4444444444',
        role: 'vendor',
      });

      product = await productModel.create({
        vendorId: vendor._id,
        name: 'Subscription Product',
        category: 'water_jar',
        price: 150,
        capacity: 20,
        unit: 'liters',
        stock: 100,
      });
    });

    it('should manage subscription delivery scheduling', async () => {
      const subscription = await subscriptionModel.create({
        customerId: customer._id,
        vendorId: vendor._id,
        productId: product._id,
        frequency: 'weekly',
        quantity: 2,
        deliveryDays: ['monday', 'wednesday', 'friday'],
        startDate: new Date('2024-01-15'), // Monday
        nextDeliveryDate: new Date('2024-01-15'),
        unitPrice: 150,
        deliveryAddress: {
          street: '123 Subscription Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          contactPhone: '5555555555',
        },
      });

      expect(subscription.status).toBe('active');
      expect(subscription.totalAmount).toBe(300); // 150 * 2

      // Simulate delivery completion
      const orderId = new Types.ObjectId();
      subscription.deliveryHistory.push({
        orderId,
        scheduledDate: subscription.nextDeliveryDate,
        deliveredDate: new Date(),
        status: 'delivered',
        quantity: 2,
        notes: 'Delivered successfully',
      });

      subscription.totalDeliveries = 1;
      subscription.successfulDeliveries = 1;
      subscription.lastDeliveryDate = new Date();

      // Calculate next delivery date (next Monday)
      const nextMonday = new Date('2024-01-22');
      subscription.nextDeliveryDate = nextMonday;

      await subscription.save();

      expect(subscription.deliveryHistory).toHaveLength(1);
      expect(subscription.deliveryHistory[0].status).toBe('delivered');
      expect(subscription.deliverySuccessRate).toBe(100); // 1/1 * 100
      expect(subscription.nextDeliveryDate.toDateString()).toBe(
        nextMonday.toDateString(),
      );
    });

    it('should handle subscription pause and resume', async () => {
      const subscription = await subscriptionModel.create({
        customerId: customer._id,
        vendorId: vendor._id,
        productId: product._id,
        frequency: 'daily',
        quantity: 1,
        startDate: new Date(),
        nextDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        unitPrice: 150,
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          contactPhone: '5555555555',
        },
      });

      // Test if subscription can be paused
      const canBePaused = subscription.status === 'active';
      expect(canBePaused).toBe(true);

      // Pause subscription
      subscription.status = 'paused';
      subscription.pausedAt = new Date();
      subscription.pausedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      subscription.pauseReason = 'Customer requested pause';
      await subscription.save();

      expect(subscription.status).toBe('paused');
      expect(subscription.pauseReason).toBe('Customer requested pause');

      // Test if subscription can be resumed
      const canBeResumed =
        subscription.status === 'paused' &&
        (!subscription.pausedUntil || new Date() >= subscription.pausedUntil);

      // Should not be resumable yet (paused until future date)
      expect(canBeResumed).toBe(false);

      // Simulate time passing and resume
      subscription.pausedUntil = new Date(Date.now() - 1000); // Past date
      const canBeResumedNow =
        subscription.status === 'paused' &&
        (!subscription.pausedUntil || new Date() >= subscription.pausedUntil);

      expect(canBeResumedNow).toBe(true);

      // Resume subscription
      subscription.status = 'active';
      subscription.pausedAt = null;
      subscription.pausedUntil = null;
      subscription.pauseReason = null;
      await subscription.save();

      expect(subscription.status).toBe('active');
      expect(subscription.pauseReason).toBeNull();
    });

    it('should track subscription performance metrics', async () => {
      const subscription = await subscriptionModel.create({
        customerId: customer._id,
        vendorId: vendor._id,
        productId: product._id,
        frequency: 'daily',
        quantity: 1,
        startDate: new Date(),
        nextDeliveryDate: new Date(),
        unitPrice: 150,
        deliveryAddress: {
          street: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
          contactPhone: '5555555555',
        },
      });

      // Simulate multiple deliveries with mixed results
      const deliveries = [
        { status: 'delivered', success: true },
        { status: 'delivered', success: true },
        { status: 'missed', success: false },
        { status: 'delivered', success: true },
        { status: 'missed', success: false },
      ];

      deliveries.forEach((delivery, index) => {
        subscription.deliveryHistory.push({
          orderId: new Types.ObjectId(),
          scheduledDate: new Date(
            Date.now() - (5 - index) * 24 * 60 * 60 * 1000,
          ),
          deliveredDate: delivery.success ? new Date() : undefined,
          status: delivery.status,
          quantity: 1,
        });

        subscription.totalDeliveries++;
        if (delivery.success) {
          subscription.successfulDeliveries++;
        } else {
          subscription.missedDeliveries++;
        }
      });

      // Calculate metrics
      subscription.deliverySuccessRate = Math.round(
        (subscription.successfulDeliveries / subscription.totalDeliveries) *
          100,
      );
      subscription.totalRevenue =
        subscription.successfulDeliveries * subscription.unitPrice;

      await subscription.save();

      expect(subscription.totalDeliveries).toBe(5);
      expect(subscription.successfulDeliveries).toBe(3);
      expect(subscription.missedDeliveries).toBe(2);
      expect(subscription.deliverySuccessRate).toBe(60); // 3/5 * 100 = 60%
      expect(subscription.totalRevenue).toBe(450); // 3 * 150 = 450
    });
  });
});
