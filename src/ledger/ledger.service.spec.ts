import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerEntry } from '../common/schemas/ledger-entry.schema';
import { Payout } from '../common/schemas/payout.schema';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
  AnalyticsPeriod,
} from '../common/interfaces/ledger.interface';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('LedgerService', () => {
  let service: LedgerService;
  let mockLedgerEntryModel: any;
  let mockPayoutModel: any;
  let mockLogger: any;

  const mockVendorId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockOrderId = '507f1f77bcf86cd799439013';

  const mockLedgerEntry = {
    _id: '507f1f77bcf86cd799439014',
    vendorId: mockVendorId,
    orderId: mockOrderId,
    userId: mockUserId,
    amount: 100,
    type: LedgerEntryType.SALE,
    status: LedgerEntryStatus.COMPLETED,
    description: 'Test sale',
    balanceAfter: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPayout = {
    _id: '507f1f77bcf86cd799439015',
    vendorId: mockVendorId,
    amount: 500,
    status: PayoutStatus.PENDING,
    method: PayoutMethod.BANK_TRANSFER,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    mockLedgerEntryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      calculateBalance: jest.fn(),
    };

    // Mock constructor function
    mockLedgerEntryModel.constructor = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...mockLedgerEntry, ...data }),
    }));

    mockPayoutModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    // Mock constructor function
    mockPayoutModel.constructor = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...mockPayout, ...data }),
    }));

    mockLogger = {
      logBusinessEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: getModelToken(LedgerEntry.name),
          useValue: mockLedgerEntryModel,
        },
        {
          provide: getModelToken(Payout.name),
          useValue: mockPayoutModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLedgerEntry', () => {
    it('should create a ledger entry successfully', async () => {
      const createDto = {
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale',
      };

      mockLedgerEntryModel.calculateBalance.mockResolvedValue(100);

      // Mock the model constructor to return a mock instance
      const mockInstance = {
        ...mockLedgerEntry,
        save: jest.fn().mockResolvedValue(mockLedgerEntry),
      };

      // Mock the service's ledgerEntryModel to act as a constructor
      service['ledgerEntryModel'] = jest
        .fn()
        .mockImplementation(() => mockInstance);

      const result = await service.createLedgerEntry(createDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe(100);
      expect(result.type).toBe(LedgerEntryType.SALE);
      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith(
        'ledger_entry_created',
        expect.any(Object),
        createDto.userId,
      );
    });

    it('should throw BadRequestException on error', async () => {
      const createDto = {
        vendorId: mockVendorId,
        orderId: mockOrderId,
        userId: mockUserId,
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale',
      };

      mockLedgerEntryModel.calculateBalance.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.createLedgerEntry(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVendorLedger', () => {
    it('should return paginated ledger entries', async () => {
      const mockEntries = [mockLedgerEntry];
      const mockTotal = 1;

      mockLedgerEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockEntries),
            }),
          }),
        }),
      });
      mockLedgerEntryModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.getVendorLedger(mockVendorId, 1, 20);

      expect(result).toBeDefined();
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should handle filtering by type and status', async () => {
      mockLedgerEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockLedgerEntryModel.countDocuments.mockResolvedValue(0);

      const result = await service.getVendorLedger(
        mockVendorId,
        1,
        20,
        LedgerEntryType.SALE,
        LedgerEntryStatus.COMPLETED,
      );

      expect(mockLedgerEntryModel.find).toHaveBeenCalledWith({
        vendorId: expect.any(Object),
        type: LedgerEntryType.SALE,
        status: LedgerEntryStatus.COMPLETED,
      });
    });
  });

  describe('getVendorAnalytics', () => {
    it('should return analytics for monthly period', async () => {
      const analyticsDto = {
        period: AnalyticsPeriod.MONTHLY,
      };

      const mockAnalyticsResult = [
        {
          _id: null,
          totalSales: 1000,
          totalRefunds: 50,
          totalCommission: 100,
          totalOrders: 10,
        },
      ];

      mockLedgerEntryModel.aggregate.mockResolvedValue(mockAnalyticsResult);

      const result = await service.getVendorAnalytics(
        mockVendorId,
        analyticsDto,
      );

      expect(result).toBeDefined();
      expect(result.vendorId).toBe(mockVendorId);
      expect(result.totalSales).toBe(1000);
      expect(result.totalRevenue).toBe(950); // 1000 - 50
      expect(result.netEarnings).toBe(850); // 950 - 100
      expect(result.averageOrderValue).toBe(100); // 1000 / 10
    });

    it('should return empty analytics when no data found', async () => {
      const analyticsDto = {
        period: AnalyticsPeriod.MONTHLY,
      };

      mockLedgerEntryModel.aggregate.mockResolvedValue([]);

      const result = await service.getVendorAnalytics(
        mockVendorId,
        analyticsDto,
      );

      expect(result).toBeDefined();
      expect(result.totalSales).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('createPayout', () => {
    it('should create a payout successfully', async () => {
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

      // Mock ledger summary to show sufficient balance
      jest.spyOn(service, 'getLedgerSummary').mockResolvedValue({
        vendorId: mockVendorId,
        totalEarnings: 1000,
        pendingPayouts: 0,
        completedPayouts: 0,
        totalCommission: 100,
        netBalance: 900,
        lastPayoutDate: undefined,
        nextPayoutDate: new Date(),
      });

      mockPayoutModel.create.mockImplementation(() => ({
        ...mockPayout,
        save: jest.fn().mockResolvedValue(mockPayout),
      }));

      const result = await service.createPayout(mockVendorId, createDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe(500);
      expect(result.method).toBe(PayoutMethod.BANK_TRANSFER);
      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith(
        'payout_requested',
        expect.any(Object),
        mockVendorId,
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const createDto = {
        amount: 1000,
        method: PayoutMethod.BANK_TRANSFER,
      };

      // Mock ledger summary to show insufficient balance
      jest.spyOn(service, 'getLedgerSummary').mockResolvedValue({
        vendorId: mockVendorId,
        totalEarnings: 500,
        pendingPayouts: 0,
        completedPayouts: 0,
        totalCommission: 50,
        netBalance: 450,
        lastPayoutDate: undefined,
        nextPayoutDate: new Date(),
      });

      await expect(
        service.createPayout(mockVendorId, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLedgerSummary', () => {
    it('should return ledger summary with correct calculations', async () => {
      const mockSummaryResult = [
        {
          _id: null,
          totalEarnings: 1000,
          totalCommission: 100,
        },
      ];

      const mockPendingPayouts = [{ _id: null, total: 200 }];
      const mockCompletedPayouts = [{ _id: null, total: 300 }];
      const mockLastPayout = {
        completedAt: new Date('2024-01-15'),
      };

      mockLedgerEntryModel.aggregate.mockResolvedValue(mockSummaryResult);
      mockPayoutModel.aggregate
        .mockResolvedValueOnce(mockPendingPayouts)
        .mockResolvedValueOnce(mockCompletedPayouts);
      mockPayoutModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockLastPayout),
      });

      const result = await service.getLedgerSummary(mockVendorId);

      expect(result).toBeDefined();
      expect(result.vendorId).toBe(mockVendorId);
      expect(result.totalEarnings).toBe(1000);
      expect(result.totalCommission).toBe(100);
      expect(result.pendingPayouts).toBe(200);
      expect(result.completedPayouts).toBe(300);
      expect(result.netBalance).toBe(400); // 1000 - 100 - 300 - 200
      expect(result.lastPayoutDate).toEqual(mockLastPayout.completedAt);
    });
  });
});
