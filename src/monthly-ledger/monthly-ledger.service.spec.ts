import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MonthlyLedgerService } from './monthly-ledger.service';
import { MonthlyLedger } from '../common/schemas/monthly-ledger.schema';
import { MonthlyLedgerStatus } from '../common/interfaces/monthly-ledger.interface';
import { CustomLoggerService } from '../common/logger/logger.service';

describe('MonthlyLedgerService', () => {
  let service: MonthlyLedgerService;
  let mockModel: any;
  let mockLogger: any;

  const mockLedgerEntry = {
    _id: 'ledger-id-1',
    userId: 'user-id-1',
    vendorId: 'vendor-id-1',
    orderId: 'order-id-1',
    rate: 30,
    quantity: 2,
    deliveryDate: new Date('2024-01-15'),
    status: MonthlyLedgerStatus.UNPAID,
    month: 1,
    year: 2024,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      exec: jest.fn(),
    };

    mockLogger = {
      logBusinessEvent: jest.fn(),
      logApiError: jest.fn(),
    };

    // Chain methods for query building
    mockModel.find.mockReturnValue(mockModel);
    mockModel.populate.mockReturnValue(mockModel);
    mockModel.sort.mockReturnValue(mockModel);
    mockModel.exec.mockResolvedValue([mockLedgerEntry]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyLedgerService,
        {
          provide: getModelToken(MonthlyLedger.name),
          useValue: mockModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MonthlyLedgerService>(MonthlyLedgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLedgerEntry', () => {
    it('should create a new ledger entry successfully', async () => {
      const createDto = {
        userId: 'user-id-1',
        vendorId: 'vendor-id-1',
        orderId: 'order-id-1',
        rate: 30,
        quantity: 2,
        deliveryDate: '2024-01-15',
        month: 1,
        year: 2024,
      };

      const mockSavedEntry = { ...mockLedgerEntry, save: jest.fn().mockResolvedValue(mockLedgerEntry) };
      mockModel = jest.fn().mockImplementation(() => mockSavedEntry);

      const result = await service.createLedgerEntry(createDto);

      expect(mockModel).toHaveBeenCalledWith({
        ...createDto,
        deliveryDate: new Date(createDto.deliveryDate),
        status: MonthlyLedgerStatus.UNPAID,
      });
      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('monthly_ledger_created', {
        ledgerId: mockLedgerEntry._id,
        userId: createDto.userId,
        vendorId: createDto.vendorId,
        amount: createDto.rate * createDto.quantity,
        month: createDto.month,
        year: createDto.year,
      });
      expect(result.id).toBe(mockLedgerEntry._id);
    });

    it('should handle creation errors', async () => {
      const createDto = {
        userId: 'user-id-1',
        vendorId: 'vendor-id-1',
        orderId: 'order-id-1',
        rate: 30,
        quantity: 2,
        deliveryDate: '2024-01-15',
        month: 1,
        year: 2024,
      };

      const error = new Error('Database error');
      mockModel = jest.fn().mockImplementation(() => {
        throw error;
      });

      await expect(service.createLedgerEntry(createDto)).rejects.toThrow(BadRequestException);
      expect(mockLogger.logApiError).toHaveBeenCalledWith('monthly-ledger', 'POST', 400, error, createDto.userId);
    });
  });

  describe('getUserLedgerEntries', () => {
    it('should retrieve user ledger entries successfully', async () => {
      const userId = 'user-id-1';
      const month = 1;
      const year = 2024;

      const result = await service.getUserLedgerEntries(userId, month, year);

      expect(mockModel.find).toHaveBeenCalledWith({ userId, month, year });
      expect(mockModel.populate).toHaveBeenCalledWith('vendorId', 'businessName');
      expect(mockModel.populate).toHaveBeenCalledWith('orderId', 'totalAmount');
      expect(mockModel.sort).toHaveBeenCalledWith({ deliveryDate: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockLedgerEntry._id);
    });

    it('should retrieve user ledger entries without date filters', async () => {
      const userId = 'user-id-1';

      await service.getUserLedgerEntries(userId);

      expect(mockModel.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('markLedgerEntryPaid', () => {
    it('should mark ledger entry as paid successfully', async () => {
      const ledgerId = 'ledger-id-1';
      const updatedEntry = { ...mockLedgerEntry, status: MonthlyLedgerStatus.PAID };
      
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedEntry),
      });

      const result = await service.markLedgerEntryPaid(ledgerId);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        ledgerId,
        { status: MonthlyLedgerStatus.PAID, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(mockLogger.logBusinessEvent).toHaveBeenCalledWith('monthly_ledger_paid', {
        ledgerId,
        userId: mockLedgerEntry.userId,
        vendorId: mockLedgerEntry.vendorId,
        amount: mockLedgerEntry.rate * mockLedgerEntry.quantity,
      });
      expect(result.status).toBe(MonthlyLedgerStatus.PAID);
    });

    it('should throw NotFoundException when ledger entry not found', async () => {
      const ledgerId = 'non-existent-id';
      mockModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.markLedgerEntryPaid(ledgerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMonthlyBillingSummary', () => {
    it('should calculate billing summary correctly', async () => {
      const userId = 'user-id-1';
      const vendorId = 'vendor-id-1';
      const month = 1;
      const year = 2024;

      const mockEntries = [
        { ...mockLedgerEntry, status: MonthlyLedgerStatus.UNPAID, rate: 30, quantity: 2 },
        { ...mockLedgerEntry, status: MonthlyLedgerStatus.PAID, rate: 25, quantity: 1 },
      ];

      mockModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEntries),
      });

      const result = await service.getMonthlyBillingSummary(userId, vendorId, month, year);

      expect(result.totalDeliveries).toBe(2);
      expect(result.totalAmount).toBe(85); // (30*2) + (25*1)
      expect(result.paidAmount).toBe(25); // Only paid entry
      expect(result.pendingAmount).toBe(60); // Total - Paid
    });
  });

  describe('getPendingDues', () => {
    it('should retrieve and group pending dues correctly', async () => {
      const mockPendingEntries = [
        {
          ...mockLedgerEntry,
          userId: { toString: () => 'user-1' },
          vendorId: { toString: () => 'vendor-1' },
          status: MonthlyLedgerStatus.UNPAID,
          rate: 30,
          quantity: 2,
        },
        {
          ...mockLedgerEntry,
          userId: { toString: () => 'user-1' },
          vendorId: { toString: () => 'vendor-1' },
          status: MonthlyLedgerStatus.UNPAID,
          rate: 25,
          quantity: 1,
        },
      ];

      mockModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPendingEntries),
      });

      const result = await service.getPendingDues();

      expect(mockModel.find).toHaveBeenCalledWith({ status: MonthlyLedgerStatus.UNPAID });
      expect(result).toHaveLength(1); // Grouped by user-vendor-month-year
      expect(result[0].totalAmount).toBe(85); // (30*2) + (25*1)
      expect(result[0].pendingAmount).toBe(85);
      expect(result[0].paidAmount).toBe(0);
    });
  });
});
