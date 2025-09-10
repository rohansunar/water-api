import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyLedgerController } from './monthly-ledger.controller';
import { MonthlyLedgerService } from './monthly-ledger.service';
import { UserRole } from '../common/interfaces/user.interface';
import { MonthlyLedgerStatus } from '../common/interfaces/monthly-ledger.interface';

describe('MonthlyLedgerController', () => {
  let controller: MonthlyLedgerController;
  let mockService: any;

  const mockUser = {
    id: 'user-id-1',
    phone: '9999999999',
    name: 'Test Admin',
    email: 'admin@test.com',
    addresses: [],
    walletBalance: 0,
    role: UserRole.ADMIN,
    isActive: true,
    monthlyPaymentMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLedgerEntry = {
    id: 'ledger-id-1',
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
  };

  beforeEach(async () => {
    mockService = {
      createLedgerEntry: jest.fn(),
      getUserLedgerEntries: jest.fn(),
      getVendorLedgerEntries: jest.fn(),
      getMonthlyBillingSummary: jest.fn(),
      markLedgerEntryPaid: jest.fn(),
      getPendingDues: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlyLedgerController],
      providers: [
        {
          provide: MonthlyLedgerService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MonthlyLedgerController>(MonthlyLedgerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLedgerEntry', () => {
    it('should create a ledger entry successfully', async () => {
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

      mockService.createLedgerEntry.mockResolvedValue(mockLedgerEntry);

      const result = await controller.createLedgerEntry(createDto);

      expect(mockService.createLedgerEntry).toHaveBeenCalledWith(createDto);
      expect(result).toBe(mockLedgerEntry);
    });
  });

  describe('getUserLedgerEntries', () => {
    it('should get user ledger entries for admin', async () => {
      const userId = 'user-id-1';
      const month = '1';
      const year = '2024';

      mockService.getUserLedgerEntries.mockResolvedValue([mockLedgerEntry]);

      const result = await controller.getUserLedgerEntries(userId, mockUser, month, year);

      expect(mockService.getUserLedgerEntries).toHaveBeenCalledWith(userId, 1, 2024);
      expect(result).toEqual([mockLedgerEntry]);
    });

    it('should restrict non-admin users to their own entries', async () => {
      const customerUser = { ...mockUser, role: UserRole.CUSTOMER, id: 'customer-id' };
      const requestedUserId = 'other-user-id';

      mockService.getUserLedgerEntries.mockResolvedValue([mockLedgerEntry]);

      await controller.getUserLedgerEntries(requestedUserId, customerUser, '1', '2024');

      // Should call with customer's own ID, not the requested ID
      expect(mockService.getUserLedgerEntries).toHaveBeenCalledWith('customer-id', 1, 2024);
    });

    it('should handle optional month and year parameters', async () => {
      const userId = 'user-id-1';

      mockService.getUserLedgerEntries.mockResolvedValue([mockLedgerEntry]);

      await controller.getUserLedgerEntries(userId, mockUser);

      expect(mockService.getUserLedgerEntries).toHaveBeenCalledWith(userId, undefined, undefined);
    });
  });

  describe('getVendorLedgerEntries', () => {
    it('should get vendor ledger entries', async () => {
      const vendorId = 'vendor-id-1';
      const month = '1';
      const year = '2024';

      mockService.getVendorLedgerEntries.mockResolvedValue([mockLedgerEntry]);

      const result = await controller.getVendorLedgerEntries(vendorId, mockUser, month, year);

      expect(mockService.getVendorLedgerEntries).toHaveBeenCalledWith(vendorId, 1, 2024);
      expect(result).toEqual([mockLedgerEntry]);
    });
  });

  describe('getMonthlyBillingSummary', () => {
    it('should get monthly billing summary for admin', async () => {
      const userId = 'user-id-1';
      const vendorId = 'vendor-id-1';
      const month = '1';
      const year = '2024';

      const mockSummary = {
        userId,
        vendorId,
        month: 1,
        year: 2024,
        totalDeliveries: 5,
        totalAmount: 150,
        paidAmount: 50,
        pendingAmount: 100,
        ledgerEntries: [mockLedgerEntry],
      };

      mockService.getMonthlyBillingSummary.mockResolvedValue(mockSummary);

      const result = await controller.getMonthlyBillingSummary(userId, vendorId, month, year, mockUser);

      expect(mockService.getMonthlyBillingSummary).toHaveBeenCalledWith(userId, vendorId, 1, 2024);
      expect(result).toBe(mockSummary);
    });

    it('should restrict customer users to their own billing summary', async () => {
      const customerUser = { ...mockUser, role: UserRole.CUSTOMER, id: 'customer-id' };
      const requestedUserId = 'other-user-id';
      const vendorId = 'vendor-id-1';

      const mockSummary = {
        userId: 'customer-id',
        vendorId,
        month: 1,
        year: 2024,
        totalDeliveries: 5,
        totalAmount: 150,
        paidAmount: 50,
        pendingAmount: 100,
        ledgerEntries: [mockLedgerEntry],
      };

      mockService.getMonthlyBillingSummary.mockResolvedValue(mockSummary);

      await controller.getMonthlyBillingSummary(requestedUserId, vendorId, '1', '2024', customerUser);

      // Should call with customer's own ID
      expect(mockService.getMonthlyBillingSummary).toHaveBeenCalledWith('customer-id', vendorId, 1, 2024);
    });
  });

  describe('markLedgerEntryPaid', () => {
    it('should mark ledger entry as paid', async () => {
      const ledgerId = 'ledger-id-1';
      const paidEntry = { ...mockLedgerEntry, status: MonthlyLedgerStatus.PAID };

      mockService.markLedgerEntryPaid.mockResolvedValue(paidEntry);

      const result = await controller.markLedgerEntryPaid(ledgerId);

      expect(mockService.markLedgerEntryPaid).toHaveBeenCalledWith(ledgerId);
      expect(result).toBe(paidEntry);
    });
  });

  describe('getPendingDues', () => {
    it('should get pending dues with filters', async () => {
      const month = '1';
      const year = '2024';

      const mockPendingDues = [
        {
          userId: 'user-1',
          vendorId: 'vendor-1',
          month: 1,
          year: 2024,
          totalDeliveries: 3,
          totalAmount: 90,
          paidAmount: 0,
          pendingAmount: 90,
          ledgerEntries: [mockLedgerEntry],
        },
      ];

      mockService.getPendingDues.mockResolvedValue(mockPendingDues);

      const result = await controller.getPendingDues(month, year);

      expect(mockService.getPendingDues).toHaveBeenCalledWith(1, 2024);
      expect(result).toBe(mockPendingDues);
    });

    it('should get pending dues without filters', async () => {
      const mockPendingDues = [];
      mockService.getPendingDues.mockResolvedValue(mockPendingDues);

      const result = await controller.getPendingDues();

      expect(mockService.getPendingDues).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toBe(mockPendingDues);
    });
  });
});
