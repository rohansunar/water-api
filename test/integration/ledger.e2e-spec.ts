import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { LedgerService } from '../../src/ledger/ledger.service';
import {
  LedgerEntry,
  LedgerEntrySchema,
} from '../../src/common/schemas/ledger-entry.schema';
import { Payout, PayoutSchema } from '../../src/common/schemas/payout.schema';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
  AnalyticsPeriod,
} from '../../src/common/interfaces/ledger.interface';
import { CustomLoggerService } from '../../src/common/logger/logger.service';

describe('Ledger Integration Tests', () => {
  let service: LedgerService;
  let ledgerEntryModel: Model<any>;
  let payoutModel: Model<any>;
  let mongod: MongoMemoryServer;

  const mockVendorId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockOrderId = '507f1f77bcf86cd799439013';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: LedgerEntry.name, schema: LedgerEntrySchema },
          { name: Payout.name, schema: PayoutSchema },
        ]),
      ],
      providers: [
        LedgerService,
        {
          provide: CustomLoggerService,
          useValue: {
            logBusinessEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleFixture.get<LedgerService>(LedgerService);
    ledgerEntryModel = moduleFixture.get<Model<any>>(
      getModelToken(LedgerEntry.name),
    );
    payoutModel = moduleFixture.get<Model<any>>(getModelToken(Payout.name));
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    await ledgerEntryModel.deleteMany({});
    await payoutModel.deleteMany({});
  });

  describe('Ledger Entry Operations', () => {
    it('should create and retrieve ledger entries', async () => {
      // Create a ledger entry
      const createDto = {
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale transaction',
      };

      const createdEntry = await service.createLedgerEntry(createDto);

      expect(createdEntry).toBeDefined();
      expect(createdEntry.vendorId).toBe(mockVendorId);
      expect(createdEntry.amount).toBe(100);
      expect(createdEntry.type).toBe(LedgerEntryType.SALE);

      // Retrieve ledger entries
      const ledgerResult = await service.getVendorLedger(mockVendorId, 1, 20);

      expect(ledgerResult.entries).toHaveLength(1);
      expect(ledgerResult.total).toBe(1);
      expect(ledgerResult.entries[0].id).toBe(createdEntry.id);
    });

    it('should filter ledger entries by type and status', async () => {
      // Create multiple ledger entries
      await service.createLedgerEntry({
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Sale transaction',
      });

      await service.createLedgerEntry({
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 50,
        type: LedgerEntryType.REFUND,
        description: 'Refund transaction',
      });

      // Filter by type
      const salesResult = await service.getVendorLedger(
        mockVendorId,
        1,
        20,
        LedgerEntryType.SALE,
      );

      expect(salesResult.entries).toHaveLength(1);
      expect(salesResult.entries[0].type).toBe(LedgerEntryType.SALE);

      const refundsResult = await service.getVendorLedger(
        mockVendorId,
        1,
        20,
        LedgerEntryType.REFUND,
      );

      expect(refundsResult.entries).toHaveLength(1);
      expect(refundsResult.entries[0].type).toBe(LedgerEntryType.REFUND);
    });

    it('should handle pagination correctly', async () => {
      // Create multiple ledger entries
      for (let i = 0; i < 25; i++) {
        await service.createLedgerEntry({
          vendorId: mockVendorId,
          orderId: mockOrderId,
          userId: mockUserId,
          amount: 100 + i,
          type: LedgerEntryType.SALE,
          description: `Sale transaction ${i}`,
        });
      }

      // Test first page
      const page1 = await service.getVendorLedger(mockVendorId, 1, 10);
      expect(page1.entries).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.totalPages).toBe(3);

      // Test second page
      const page2 = await service.getVendorLedger(mockVendorId, 2, 10);
      expect(page2.entries).toHaveLength(10);
      expect(page2.page).toBe(2);

      // Test last page
      const page3 = await service.getVendorLedger(mockVendorId, 3, 10);
      expect(page3.entries).toHaveLength(5);
    });
  });

  describe('Analytics Operations', () => {
    beforeEach(async () => {
      // Create sample data for analytics
      const entries = [
        {
          vendorId: mockVendorId,
          orderId: mockOrderId,
          userId: mockUserId,
          amount: 1000,
          type: LedgerEntryType.SALE,
          status: LedgerEntryStatus.COMPLETED,
          description: 'Sale 1',
        },
        {
          vendorId: mockVendorId,
          orderId: mockOrderId,
          userId: mockUserId,
          amount: 500,
          type: LedgerEntryType.SALE,
          status: LedgerEntryStatus.COMPLETED,
          description: 'Sale 2',
        },
        {
          vendorId: mockVendorId,
          orderId: mockOrderId,
          userId: mockUserId,
          amount: 100,
          type: LedgerEntryType.REFUND,
          status: LedgerEntryStatus.COMPLETED,
          description: 'Refund 1',
        },
        {
          vendorId: mockVendorId,
          orderId: mockOrderId,
          userId: mockUserId,
          amount: 150,
          type: LedgerEntryType.COMMISSION,
          status: LedgerEntryStatus.COMPLETED,
          description: 'Commission 1',
        },
      ];

      for (const entry of entries) {
        await service.createLedgerEntry(entry);
      }

      // Update entries to completed status
      await ledgerEntryModel.updateMany(
        { vendorId: mockVendorId },
        { status: LedgerEntryStatus.COMPLETED },
      );
    });

    it('should calculate vendor analytics correctly', async () => {
      const analyticsDto = {
        period: AnalyticsPeriod.MONTHLY,
      };

      const analytics = await service.getVendorAnalytics(
        mockVendorId,
        analyticsDto,
      );

      expect(analytics).toBeDefined();
      expect(analytics.vendorId).toBe(mockVendorId);
      expect(analytics.totalSales).toBe(1500); // 1000 + 500
      expect(analytics.totalOrders).toBe(2); // 2 sale transactions
      expect(analytics.totalRevenue).toBe(1400); // 1500 - 100 (refund)
      expect(analytics.totalCommission).toBe(150);
      expect(analytics.netEarnings).toBe(1250); // 1400 - 150
      expect(analytics.averageOrderValue).toBe(750); // 1500 / 2
    });

    it('should return empty analytics for vendor with no data', async () => {
      const emptyVendorId = '507f1f77bcf86cd799439099';
      const analyticsDto = {
        period: AnalyticsPeriod.MONTHLY,
      };

      const analytics = await service.getVendorAnalytics(
        emptyVendorId,
        analyticsDto,
      );

      expect(analytics.totalSales).toBe(0);
      expect(analytics.totalOrders).toBe(0);
      expect(analytics.totalRevenue).toBe(0);
      expect(analytics.netEarnings).toBe(0);
    });
  });

  describe('Payout Operations', () => {
    beforeEach(async () => {
      // Create some earnings for the vendor
      await service.createLedgerEntry({
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 1000,
        type: LedgerEntryType.SALE,
        description: 'Sale for payout test',
      });

      await ledgerEntryModel.updateMany(
        { vendorId: mockVendorId },
        { status: LedgerEntryStatus.COMPLETED },
      );
    });

    it('should create payout request successfully', async () => {
      const createDto = {
        amount: 500,
        method: PayoutMethod.BANK_TRANSFER,
        bankDetails: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          accountHolderName: 'Test Vendor',
          bankName: 'State Bank of India',
        },
      };

      const payout = await service.createPayout(mockVendorId, createDto);

      expect(payout).toBeDefined();
      expect(payout.vendorId).toBe(mockVendorId);
      expect(payout.amount).toBe(500);
      expect(payout.method).toBe(PayoutMethod.BANK_TRANSFER);
      expect(payout.status).toBe(PayoutStatus.PENDING);
    });

    it('should reject payout request for insufficient balance', async () => {
      const createDto = {
        amount: 2000, // More than available balance
        method: PayoutMethod.BANK_TRANSFER,
      };

      await expect(
        service.createPayout(mockVendorId, createDto),
      ).rejects.toThrow();
    });

    it('should retrieve vendor payouts with pagination', async () => {
      // Create multiple payouts
      for (let i = 0; i < 5; i++) {
        await service.createPayout(mockVendorId, {
          amount: 100 + i * 10,
          method: PayoutMethod.UPI,
          upiDetails: {
            upiId: `vendor${i}@upi`,
            name: 'Test Vendor',
          },
        });
      }

      const payoutsResult = await service.getVendorPayouts(mockVendorId, 1, 3);

      expect(payoutsResult.payouts).toHaveLength(3);
      expect(payoutsResult.total).toBe(5);
      expect(payoutsResult.totalPages).toBe(2);
    });
  });

  describe('Ledger Summary Operations', () => {
    it('should calculate ledger summary correctly', async () => {
      // Create various transactions
      await service.createLedgerEntry({
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 1000,
        type: LedgerEntryType.SALE,
        description: 'Sale 1',
      });

      await service.createLedgerEntry({
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 100,
        type: LedgerEntryType.COMMISSION,
        description: 'Commission 1',
      });

      // Update to completed status
      await ledgerEntryModel.updateMany(
        { vendorId: mockVendorId },
        { status: LedgerEntryStatus.COMPLETED },
      );

      // Create a completed payout
      const payout = await payoutModel.create({
        vendorId: mockVendorId,
        amount: 300,
        status: PayoutStatus.COMPLETED,
        method: PayoutMethod.BANK_TRANSFER,
        completedAt: new Date(),
      });

      const summary = await service.getLedgerSummary(mockVendorId);

      expect(summary).toBeDefined();
      expect(summary.vendorId).toBe(mockVendorId);
      expect(summary.totalEarnings).toBe(1000);
      expect(summary.totalCommission).toBe(100);
      expect(summary.completedPayouts).toBe(300);
      expect(summary.netBalance).toBe(600); // 1000 - 100 - 300
    });
  });
});
