import { Test, TestingModule } from '@nestjs/testing';
import { LedgerController, AdminLedgerController } from '../../src/ledger/ledger.controller';
import { LedgerService } from '../../src/ledger/ledger.service';
import { CustomerRole } from '../../src/common/interfaces/user.interface';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
  AnalyticsPeriod,
} from '../../src/common/interfaces/ledger.interface';

describe('LedgerController', () => {
  let controller: LedgerController;
  let mockService: any;

  const mockVendor = {
    id: 'vendor-id-1',
    phone: '9999999999',
    name: 'Test Vendor',
    email: 'vendor@test.com',
    addresses: [],
    walletBalance: 0,
    role: CustomerRole.VENDOR,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLedgerEntry = {
    id: 'ledger-id-1',
    vendorId: 'vendor-id-1',
    orderId: 'order-id-1',
    userId: 'user-id-1',
    amount: 100,
    type: LedgerEntryType.SALE,
    status: LedgerEntryStatus.COMPLETED,
    description: 'Test sale',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayout = {
    id: 'payout-id-1',
    vendorId: 'vendor-id-1',
    amount: 500,
    status: PayoutStatus.PENDING,
    method: PayoutMethod.BANK_TRANSFER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockService = {
      getVendorLedger: jest.fn(),
      createLedgerEntry: jest.fn(),
      getVendorAnalytics: jest.fn(),
      getLedgerSummary: jest.fn(),
      getVendorPayouts: jest.fn(),
      createPayout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [
        {
          provide: LedgerService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LedgerController>(LedgerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVendorLedger', () => {
    it('should get vendor ledger entries', async () => {
      const mockResponse = {
        entries: [mockLedgerEntry],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockService.getVendorLedger.mockResolvedValue(mockResponse);

      const result = await controller.getVendorLedger(mockVendor, 1, 20);

      expect(mockService.getVendorLedger).toHaveBeenCalledWith(
        mockVendor.id,
        1,
        20,
        undefined,
        undefined,
      );
      expect(result).toBe(mockResponse);
    });

    it('should get vendor ledger entries with filters', async () => {
      const mockResponse = {
        entries: [mockLedgerEntry],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockService.getVendorLedger.mockResolvedValue(mockResponse);

      const result = await controller.getVendorLedger(
        mockVendor,
        1,
        20,
        LedgerEntryType.SALE,
        LedgerEntryStatus.COMPLETED,
      );

      expect(mockService.getVendorLedger).toHaveBeenCalledWith(
        mockVendor.id,
        1,
        20,
        LedgerEntryType.SALE,
        LedgerEntryStatus.COMPLETED,
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('createLedgerEntry', () => {
    it('should create ledger entry for vendor', async () => {
      const createDto = {
        vendorId: mockVendor.id,
        orderId: 'order-id-1',
        userId: 'user-id-1',
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale',
      };

      mockService.createLedgerEntry.mockResolvedValue(mockLedgerEntry);

      const result = await controller.createLedgerEntry(mockVendor, createDto);

      expect(mockService.createLedgerEntry).toHaveBeenCalledWith(createDto);
      expect(result).toBe(mockLedgerEntry);
    });

    it('should throw error if vendor tries to create entry for another vendor', async () => {
      const createDto = {
        vendorId: 'different-vendor-id',
        orderId: 'order-id-1',
        userId: 'user-id-1',
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale',
      };

      await expect(
        controller.createLedgerEntry(mockVendor, createDto),
      ).rejects.toThrow();
    });
  });

  describe('getVendorAnalytics', () => {
    it('should get vendor analytics', async () => {
      const analyticsDto = {
        period: AnalyticsPeriod.MONTHLY,
      };

      const mockAnalytics = {
        vendorId: mockVendor.id,
        period: AnalyticsPeriod.MONTHLY,
        startDate: new Date(),
        endDate: new Date(),
        totalSales: 1000,
        totalOrders: 10,
        totalRevenue: 950,
        totalCommission: 100,
        netEarnings: 850,
        averageOrderValue: 100,
        topProducts: [],
        salesTrend: [],
      };

      mockService.getVendorAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getVendorAnalytics(
        mockVendor,
        analyticsDto,
      );

      expect(mockService.getVendorAnalytics).toHaveBeenCalledWith(
        mockVendor.id,
        analyticsDto,
      );
      expect(result).toBe(mockAnalytics);
    });
  });

  describe('getLedgerSummary', () => {
    it('should get ledger summary', async () => {
      const mockSummary = {
        vendorId: mockVendor.id,
        totalEarnings: 1000,
        pendingPayouts: 200,
        completedPayouts: 300,
        totalCommission: 100,
        netBalance: 400,
        lastPayoutDate: new Date(),
        nextPayoutDate: new Date(),
      };

      mockService.getLedgerSummary.mockResolvedValue(mockSummary);

      const result = await controller.getLedgerSummary(mockVendor);

      expect(mockService.getLedgerSummary).toHaveBeenCalledWith(mockVendor.id);
      expect(result).toBe(mockSummary);
    });
  });

  describe('getVendorPayouts', () => {
    it('should get vendor payouts', async () => {
      const mockResponse = {
        payouts: [mockPayout],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockService.getVendorPayouts.mockResolvedValue(mockResponse);

      const result = await controller.getVendorPayouts(mockVendor, 1, 20);

      expect(mockService.getVendorPayouts).toHaveBeenCalledWith(
        mockVendor.id,
        1,
        20,
        undefined,
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('createPayout', () => {
    it('should create payout request', async () => {
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

      mockService.createPayout.mockResolvedValue(mockPayout);

      const result = await controller.createPayout(mockVendor, createDto);

      expect(mockService.createPayout).toHaveBeenCalledWith(
        mockVendor.id,
        createDto,
      );
      expect(result).toBe(mockPayout);
    });
  });
});

describe('AdminLedgerController', () => {
  let controller: AdminLedgerController;
  let mockService: any;

  const mockAdmin = {
    id: 'admin-id-1',
    phone: '9999999999',
    name: 'Test Admin',
    email: 'admin@test.com',
    addresses: [],
    walletBalance: 0,
    role: CustomerRole.ADMIN,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockService = {
      getVendorLedger: jest.fn(),
      createLedgerEntry: jest.fn(),
      getVendorAnalytics: jest.fn(),
      getVendorPayouts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLedgerController],
      providers: [
        {
          provide: LedgerService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminLedgerController>(AdminLedgerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVendorLedger', () => {
    it('should get any vendor ledger entries as admin', async () => {
      const vendorId = 'vendor-id-1';
      const mockResponse = {
        entries: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockService.getVendorLedger.mockResolvedValue(mockResponse);

      const result = await controller.getVendorLedger(vendorId, 1, 20);

      expect(mockService.getVendorLedger).toHaveBeenCalledWith(
        vendorId,
        1,
        20,
        undefined,
        undefined,
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('createLedgerEntry', () => {
    it('should create ledger entry for any vendor as admin', async () => {
      const createDto = {
        vendorId: 'vendor-id-1',
        orderId: 'order-id-1',
        userId: 'user-id-1',
        amount: 100,
        type: LedgerEntryType.SALE,
        description: 'Test sale',
      };

      const mockLedgerEntry = {
        id: 'ledger-id-1',
        ...createDto,
        status: LedgerEntryStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockService.createLedgerEntry.mockResolvedValue(mockLedgerEntry);

      const result = await controller.createLedgerEntry(mockAdmin, createDto);

      expect(mockService.createLedgerEntry).toHaveBeenCalledWith(createDto);
      expect(result).toBe(mockLedgerEntry);
    });
  });
});
