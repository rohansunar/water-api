import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
  AnalyticsPeriod,
  VendorAnalytics,
  LedgerSummary,
} from '../interfaces/ledger.interface';
import {
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
  LedgerEntryResponseDto,
  CreatePayoutDto,
  PayoutResponseDto,
  GetAnalyticsDto,
  VendorAnalyticsResponseDto,
  LedgerSummaryResponseDto,
} from '../dto/ledger.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';

/**
 * Ledger Service
 * Manages vendor financial transactions, analytics, and payouts
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private prisma: PrismaService,
    private customLogger: CustomLoggerService,
  ) {}

  /**
   * Create a new ledger entry
   */
  async createLedgerEntry(
    createDto: CreateLedgerEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    try {
      this.logger.log(`Creating ledger entry for vendor ${createDto.vendorId}`);

      // Calculate balance after this entry
      // For now, we'll use a simple balance calculation
      const balanceAfter = createDto.amount; // TODO: Implement proper balance calculation

      const ledgerEntry = await this.prisma.ledgerEntry.create({
        data: {
          vendorId: BigInt(createDto.vendorId),
          orderId: createDto.orderId ? BigInt(createDto.orderId) : null,
          orderCreatedAt: createDto.orderId ? new Date() : null, // TODO: Get actual order createdAt
          userId: createDto.userId ? BigInt(createDto.userId) : null,
          type: createDto.type,
          amount: createDto.amount,
          balanceAfter: balanceAfter,
          status: LedgerEntryStatus.PENDING,
          description: createDto.description,
          referenceId: createDto.referenceId,
          metadata: createDto.metadata || {},
        },
      });

      this.customLogger.logBusinessEvent(
        'ledger_entry_created',
        {
          ledgerEntryId: ledgerEntry.id.toString(),
          vendorId: createDto.vendorId,
          amount: createDto.amount,
          type: createDto.type,
        },
        createDto.userId,
      );

      return this.mapToResponseDto(ledgerEntry);
    } catch (error) {
      this.logger.error(`Failed to create ledger entry: ${error.message}`);
      throw new BadRequestException('Failed to create ledger entry');
    }
  }

  /**
   * Get vendor's ledger entries with pagination
   */
  async getVendorLedger(
    vendorId: string,
    page: number = 1,
    limit: number = 20,
    type?: LedgerEntryType,
    status?: LedgerEntryStatus,
  ): Promise<{
    entries: LedgerEntryResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = { vendorId: BigInt(vendorId) };

      if (type) where.type = type;
      if (status) where.status = status;

      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.prisma.ledgerEntry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.ledgerEntry.count({ where }),
      ]);

      return {
        entries: entries.map((entry) => this.mapToResponseDto(entry)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get vendor ledger: ${error.message}`);
      throw new BadRequestException('Failed to retrieve ledger entries');
    }
  }

  /**
   * Get vendor analytics for specified period
   */
  async getVendorAnalytics(
    vendorId: string,
    analyticsDto: GetAnalyticsDto,
  ): Promise<VendorAnalyticsResponseDto> {
    try {
      const { startDate, endDate } = this.calculateDateRange(
        analyticsDto.period,
        analyticsDto.startDate,
        analyticsDto.endDate,
      );

      const where = {
        vendorId: BigInt(vendorId),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: LedgerEntryStatus.COMPLETED,
      };

      // Get all ledger entries for calculations
      const entries = await this.prisma.ledgerEntry.findMany({
        where,
        select: {
          type: true,
          amount: true,
        },
      });

      if (!entries || entries.length === 0) {
        return this.createEmptyAnalytics(
          vendorId,
          analyticsDto.period,
          startDate,
          endDate,
        );
      }

      // Calculate analytics using JavaScript aggregation
      const analytics = entries.reduce(
        (acc, entry) => {
          const amount = Number(entry.amount);
          switch (entry.type) {
            case LedgerEntryType.SALE:
              acc.totalSales += amount;
              acc.totalOrders += 1;
              break;
            case LedgerEntryType.REFUND:
              acc.totalRefunds += amount;
              break;
            case LedgerEntryType.COMMISSION:
              acc.totalCommission += amount;
              break;
          }
          return acc;
        },
        {
          totalSales: 0,
          totalRefunds: 0,
          totalCommission: 0,
          totalOrders: 0,
        },
      );

      const totalRevenue = analytics.totalSales - analytics.totalRefunds;
      const netEarnings = totalRevenue - analytics.totalCommission;
      const averageOrderValue =
        analytics.totalOrders > 0
          ? analytics.totalSales / analytics.totalOrders
          : 0;

      return {
        vendorId,
        period: analyticsDto.period,
        startDate,
        endDate,
        totalSales: analytics.totalSales,
        totalOrders: analytics.totalOrders,
        totalRevenue,
        totalCommission: analytics.totalCommission,
        netEarnings,
        averageOrderValue,
        topProducts: [], // TODO: Implement product analytics
        salesTrend: [], // TODO: Implement sales trend
      };
    } catch (error) {
      this.logger.error(`Failed to get vendor analytics: ${error.message}`);
      throw new BadRequestException('Failed to retrieve analytics');
    }
  }

  /**
   * Get ledger summary for vendor
   */
  async getLedgerSummary(vendorId: string): Promise<LedgerSummaryResponseDto> {
    try {
      // Get ledger entries for earnings and commission calculations
      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: {
          vendorId: BigInt(vendorId),
          status: LedgerEntryStatus.COMPLETED,
        },
        select: {
          type: true,
          amount: true,
        },
      });

      // Calculate ledger summary
      const ledgerSummary = ledgerEntries.reduce(
        (acc, entry) => {
          const amount = Number(entry.amount);
          if (
            [LedgerEntryType.SALE, LedgerEntryType.ADJUSTMENT].includes(
              entry.type as LedgerEntryType,
            )
          ) {
            acc.totalEarnings += amount;
          } else if (entry.type === LedgerEntryType.COMMISSION) {
            acc.totalCommission += amount;
          }
          return acc;
        },
        {
          totalEarnings: 0,
          totalCommission: 0,
        },
      );

      // Get payout summary
      const payoutEntries = await this.prisma.payout.findMany({
        where: {
          vendorId: BigInt(vendorId),
        },
        select: {
          status: true,
          amount: true,
          completedAt: true,
        },
      });

      const payoutSummary = payoutEntries.reduce(
        (acc, payout) => {
          const amount = Number(payout.amount);
          if (
            [PayoutStatus.PENDING, PayoutStatus.PROCESSING].includes(
              payout.status as PayoutStatus,
            )
          ) {
            acc.pendingPayouts += amount;
          } else if (payout.status === PayoutStatus.COMPLETED) {
            acc.completedPayouts += amount;
            if (
              payout.completedAt &&
              (!acc.lastPayoutDate || payout.completedAt > acc.lastPayoutDate)
            ) {
              acc.lastPayoutDate = payout.completedAt;
            }
          }
          return acc;
        },
        {
          pendingPayouts: 0,
          completedPayouts: 0,
          lastPayoutDate: null as Date | null,
        },
      );

      const totalEarnings = ledgerSummary.totalEarnings;
      const totalCommission = ledgerSummary.totalCommission;
      const pendingPayoutAmount = payoutSummary.pendingPayouts;
      const completedPayoutAmount = payoutSummary.completedPayouts;
      const netBalance =
        totalEarnings -
        totalCommission -
        completedPayoutAmount -
        pendingPayoutAmount;

      return {
        vendorId,
        totalEarnings,
        pendingPayouts: pendingPayoutAmount,
        completedPayouts: completedPayoutAmount,
        totalCommission,
        netBalance,
        lastPayoutDate: payoutSummary.lastPayoutDate,
        nextPayoutDate: this.calculateNextPayoutDate(),
      };
    } catch (error) {
      this.logger.error(`Failed to get ledger summary: ${error.message}`);
      throw new BadRequestException('Failed to retrieve ledger summary');
    }
  }

  /**
   * Create a payout request
   */
  async createPayout(
    vendorId: string,
    createDto: CreatePayoutDto,
  ): Promise<PayoutResponseDto> {
    try {
      this.logger.log(`Creating payout for vendor ${vendorId}`);

      // Check if vendor has sufficient balance
      const summary = await this.getLedgerSummary(vendorId);
      if (summary.netBalance < createDto.amount) {
        throw new BadRequestException('Insufficient balance for payout');
      }

      const payout = await this.prisma.payout.create({
        data: {
          vendorId: BigInt(vendorId),
          amount: createDto.amount,
          method: createDto.method,
          payoutDetails:
            createDto.bankDetails || createDto.upiDetails
              ? {
                  bankAccountNumber: createDto.bankDetails?.accountNumber,
                  ifscCode: createDto.bankDetails?.ifscCode,
                  accountHolderName:
                    createDto.bankDetails?.accountHolderName ||
                    createDto.upiDetails?.name,
                  bankName: createDto.bankDetails?.bankName,
                  upiId: createDto.upiDetails?.upiId,
                }
              : {},
          status: PayoutStatus.PENDING,
        },
      });

      this.customLogger.logBusinessEvent(
        'payout_requested',
        {
          payoutId: payout.id.toString(),
          vendorId,
          amount: createDto.amount,
          method: createDto.method,
        },
        vendorId,
      );

      return this.mapPayoutToResponseDto(payout);
    } catch (error) {
      this.logger.error(`Failed to create payout: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payout');
    }
  }

  /**
   * Get vendor payouts with pagination
   */
  async getVendorPayouts(
    vendorId: string,
    page: number = 1,
    limit: number = 20,
    status?: PayoutStatus,
  ): Promise<{
    payouts: PayoutResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = { vendorId: BigInt(vendorId) };
      if (status) where.status = status;

      const skip = (page - 1) * limit;

      const [payouts, total] = await Promise.all([
        this.prisma.payout.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.payout.count({ where }),
      ]);

      return {
        payouts: payouts.map((payout) => this.mapPayoutToResponseDto(payout)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get vendor payouts: ${error.message}`);
      throw new BadRequestException('Failed to retrieve payouts');
    }
  }

  // Helper methods
  private mapToResponseDto(entry: any): LedgerEntryResponseDto {
    return {
      id: entry.id.toString(),
      vendorId: entry.vendorId.toString(),
      orderId: entry.orderId?.toString() || '',
      userId: entry.userId?.toString() || '',
      amount: Number(entry.amount),
      type: entry.type as LedgerEntryType,
      status: entry.status as LedgerEntryStatus,
      description: entry.description,
      referenceId: entry.referenceId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private mapPayoutToResponseDto(payout: any): PayoutResponseDto {
    const payoutDetails = payout.payoutDetails;
    return {
      id: payout.id.toString(),
      vendorId: payout.vendorId.toString(),
      amount: Number(payout.amount),
      status: payout.status as PayoutStatus,
      method: payout.method as PayoutMethod,
      bankDetails: payoutDetails?.bankAccountNumber
        ? {
            accountNumber: payoutDetails.bankAccountNumber,
            ifscCode: payoutDetails.ifscCode || '',
            accountHolderName: payoutDetails.accountHolderName || '',
            bankName: payoutDetails.bankName || '',
          }
        : undefined,
      upiDetails: payoutDetails?.upiId
        ? {
            upiId: payoutDetails.upiId,
            name: payoutDetails.accountHolderName || '',
          }
        : undefined,
      transactionId: payout.transactionId,
      processedAt: payout.completedAt,
      failureReason: payout.failureReason,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    };
  }

  private calculateDateRange(
    period: AnalyticsPeriod,
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let start: Date;
    const end: Date = endDate ? new Date(endDate) : now;

    if (startDate) {
      start = new Date(startDate);
    } else {
      switch (period) {
        case AnalyticsPeriod.DAILY:
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case AnalyticsPeriod.WEEKLY:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case AnalyticsPeriod.MONTHLY:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case AnalyticsPeriod.QUARTERLY:
          const quarter = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case AnalyticsPeriod.YEARLY:
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate: start, endDate: end };
  }

  private createEmptyAnalytics(
    vendorId: string,
    period: AnalyticsPeriod,
    startDate: Date,
    endDate: Date,
  ): VendorAnalyticsResponseDto {
    return {
      vendorId,
      period,
      startDate,
      endDate,
      totalSales: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalCommission: 0,
      netEarnings: 0,
      averageOrderValue: 0,
      topProducts: [],
      salesTrend: [],
    };
  }

  private calculateNextPayoutDate(): Date {
    // Calculate next payout date (e.g., weekly payouts on Fridays)
    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    const nextFriday = new Date(
      now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000,
    );
    return nextFriday;
  }
}
