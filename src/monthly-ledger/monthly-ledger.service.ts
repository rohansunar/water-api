import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  MonthlyLedger,
  MonthlyLedgerDocument,
} from '../common/schemas/monthly-ledger.schema';
import {
  MonthlyLedgerStatus,
  InvoiceStatus,
  MonthlyInvoice,
  MonthlyBillingSummary,
} from '../common/interfaces/monthly-ledger.interface';
import {
  CreateMonthlyLedgerDto,
  UpdateMonthlyLedgerDto,
  MonthlyLedgerResponseDto,
  MonthlyInvoiceDto,
  MonthlyBillingSummaryDto,
  GenerateInvoiceDto,
} from '../common/dto/monthly-ledger.dto';
import { CustomLoggerService } from '../common/logger/logger.service';

@Injectable()
export class MonthlyLedgerService {
  private readonly logger = new Logger(MonthlyLedgerService.name);

  constructor(
    @InjectModel(MonthlyLedger.name)
    private monthlyLedgerModel: Model<MonthlyLedgerDocument>,
    private customLogger: CustomLoggerService,
  ) {}

  async createLedgerEntry(
    createDto: CreateMonthlyLedgerDto,
  ): Promise<MonthlyLedgerResponseDto> {
    try {
      const ledgerEntry = new this.monthlyLedgerModel({
        ...createDto,
        deliveryDate: new Date(createDto.deliveryDate),
        status: MonthlyLedgerStatus.UNPAID,
      });

      const savedEntry = await ledgerEntry.save();

      this.logger.log(
        `Created monthly ledger entry ${savedEntry._id} for user ${createDto.userId}`,
      );
      this.customLogger.logBusinessEvent('monthly_ledger_created', {
        ledgerId: savedEntry._id.toString(),
        userId: createDto.userId,
        vendorId: createDto.vendorId,
        amount: createDto.rate * createDto.quantity,
        month: createDto.month,
        year: createDto.year,
      });

      return this.mapToResponseDto(savedEntry);
    } catch (error) {
      this.logger.error(`Failed to create monthly ledger entry:`, error);
      this.customLogger.logApiError(
        'monthly-ledger',
        'POST',
        400,
        error,
        createDto.userId,
      );
      throw new BadRequestException('Failed to create monthly ledger entry');
    }
  }

  async getUserLedgerEntries(
    userId: string,
    month?: number,
    year?: number,
  ): Promise<MonthlyLedgerResponseDto[]> {
    try {
      const query: any = { userId };

      if (month !== undefined) query.month = month;
      if (year !== undefined) query.year = year;

      const entries = await this.monthlyLedgerModel
        .find(query)
        .populate('vendorId', 'businessName')
        .populate('orderId', 'totalAmount')
        .sort({ deliveryDate: -1 })
        .exec();

      return entries.map((entry) => this.mapToResponseDto(entry));
    } catch (error) {
      this.logger.error(
        `Failed to get user ledger entries for user ${userId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve ledger entries');
    }
  }

  async getVendorLedgerEntries(
    vendorId: string,
    month?: number,
    year?: number,
  ): Promise<MonthlyLedgerResponseDto[]> {
    try {
      const query: any = { vendorId };

      if (month !== undefined) query.month = month;
      if (year !== undefined) query.year = year;

      const entries = await this.monthlyLedgerModel
        .find(query)
        .populate('userId', 'name phone')
        .populate('orderId', 'totalAmount')
        .sort({ deliveryDate: -1 })
        .exec();

      return entries.map((entry) => this.mapToResponseDto(entry));
    } catch (error) {
      this.logger.error(
        `Failed to get vendor ledger entries for vendor ${vendorId}:`,
        error,
      );
      throw new BadRequestException('Failed to retrieve vendor ledger entries');
    }
  }

  async getMonthlyBillingSummary(
    userId: string,
    vendorId: string,
    month: number,
    year: number,
  ): Promise<MonthlyBillingSummaryDto> {
    try {
      const entries = await this.monthlyLedgerModel
        .find({ userId, vendorId, month, year })
        .exec();

      const totalDeliveries = entries.length;
      const totalAmount = entries.reduce(
        (sum, entry) => sum + entry.rate * entry.quantity,
        0,
      );
      const paidAmount = entries
        .filter((entry) => entry.status === MonthlyLedgerStatus.PAID)
        .reduce((sum, entry) => sum + entry.rate * entry.quantity, 0);
      const pendingAmount = totalAmount - paidAmount;

      return {
        userId,
        vendorId,
        month,
        year,
        totalDeliveries,
        totalAmount,
        paidAmount,
        pendingAmount,
        ledgerEntries: entries.map((entry) => this.mapToResponseDto(entry)),
      };
    } catch (error) {
      this.logger.error(`Failed to get monthly billing summary:`, error);
      throw new BadRequestException(
        'Failed to retrieve monthly billing summary',
      );
    }
  }

  async markLedgerEntryPaid(
    ledgerId: string,
  ): Promise<MonthlyLedgerResponseDto> {
    try {
      const entry = await this.monthlyLedgerModel
        .findByIdAndUpdate(
          ledgerId,
          { status: MonthlyLedgerStatus.PAID, updatedAt: new Date() },
          { new: true },
        )
        .exec();

      if (!entry) {
        throw new NotFoundException('Ledger entry not found');
      }

      this.logger.log(`Marked ledger entry ${ledgerId} as paid`);
      this.customLogger.logBusinessEvent('monthly_ledger_paid', {
        ledgerId,
        userId: entry.userId.toString(),
        vendorId: entry.vendorId.toString(),
        amount: entry.rate * entry.quantity,
      });

      return this.mapToResponseDto(entry);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to mark ledger entry as paid:`, error);
      throw new BadRequestException('Failed to update ledger entry');
    }
  }

  async getPendingDues(
    month?: number,
    year?: number,
  ): Promise<MonthlyBillingSummaryDto[]> {
    try {
      const query: any = { status: MonthlyLedgerStatus.UNPAID };

      if (month !== undefined) query.month = month;
      if (year !== undefined) query.year = year;

      const entries = await this.monthlyLedgerModel
        .find(query)
        .populate('userId', 'name phone')
        .populate('vendorId', 'businessName')
        .exec();

      // Group by user and vendor
      const groupedEntries = entries.reduce((acc, entry) => {
        const key = `${entry.userId}-${entry.vendorId}-${entry.month}-${entry.year}`;
        if (!acc[key]) {
          acc[key] = {
            userId: entry.userId.toString(),
            vendorId: entry.vendorId.toString(),
            month: entry.month,
            year: entry.year,
            entries: [],
          };
        }
        acc[key].entries.push(entry);
        return acc;
      }, {});

      return Object.values(groupedEntries).map((group: any) => {
        const totalAmount = group.entries.reduce(
          (sum, entry) => sum + entry.rate * entry.quantity,
          0,
        );
        return {
          userId: group.userId,
          vendorId: group.vendorId,
          month: group.month,
          year: group.year,
          totalDeliveries: group.entries.length,
          totalAmount,
          paidAmount: 0,
          pendingAmount: totalAmount,
          ledgerEntries: group.entries.map((entry) =>
            this.mapToResponseDto(entry),
          ),
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get pending dues:`, error);
      throw new BadRequestException('Failed to retrieve pending dues');
    }
  }

  private mapToResponseDto(
    ledger: MonthlyLedgerDocument,
  ): MonthlyLedgerResponseDto {
    return {
      id: ledger._id.toString(),
      userId: ledger.userId.toString(),
      vendorId: ledger.vendorId.toString(),
      orderId: ledger.orderId.toString(),
      rate: ledger.rate,
      quantity: ledger.quantity,
      deliveryDate: ledger.deliveryDate,
      status: ledger.status as MonthlyLedgerStatus,
      month: ledger.month,
      year: ledger.year,
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }
}
