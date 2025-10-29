import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  LedgerEntry,
  LedgerEntryDocument,
} from '../../common/schemas/ledger-entry.schema';
import { Payout, PayoutDocument } from '../../common/schemas/payout.schema';
import {
  LedgerEntryType,
  LedgerEntryStatus,
  PayoutStatus,
  PayoutMethod,
  AnalyticsPeriod,
  VendorAnalytics,
  LedgerSummary,
} from '../../common/interfaces/ledger.interface';
import {
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
  LedgerEntryResponseDto,
  CreatePayoutDto,
  PayoutResponseDto,
  GetAnalyticsDto,
  VendorAnalyticsResponseDto,
  LedgerSummaryResponseDto,
} from '../../common/dto/ledger.dto';
import { CustomLoggerService } from '../../common/logger/logger.service';

/**
 * Ledger Service
 * Manages vendor financial transactions, analytics, and payouts
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectModel(LedgerEntry.name)
    private ledgerEntryModel: Model<LedgerEntryDocument>,
    @InjectModel(Payout.name)
    private payoutModel: Model<PayoutDocument>,
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

      const ledgerEntry = new this.ledgerEntryModel({
        ...createDto,
        vendorId: new Types.ObjectId(createDto.vendorId),
        orderId: new Types.ObjectId(createDto.orderId),
        userId: new Types.ObjectId(createDto.userId),
        balanceAfter,
        status: LedgerEntryStatus.PENDING,
      });

      const savedEntry = await ledgerEntry.save();

      this.customLogger.logBusinessEvent(
        'ledger_entry_created',
        {
          ledgerEntryId: savedEntry._id,
          vendorId: createDto.vendorId,
          amount: createDto.amount,
          type: createDto.type,
        },
        createDto.userId,
      );

      return this.mapToResponseDto(savedEntry);
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
      const filter: any = { vendorId: new Types.ObjectId(vendorId) };

      if (type) filter.type = type;
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.ledgerEntryModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.ledgerEntryModel.countDocuments(filter),
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

      const pipeline = [
        {
          $match: {
            vendorId: new Types.ObjectId(vendorId),
            createdAt: { $gte: startDate, $lte: endDate },
            status: LedgerEntryStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: {
                $cond: [{ $eq: ['$type', LedgerEntryType.SALE] }, '$amount', 0],
              },
            },
            totalRefunds: {
              $sum: {
                $cond: [
                  { $eq: ['$type', LedgerEntryType.REFUND] },
                  '$amount',
                  0,
                ],
              },
            },
            totalCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$type', LedgerEntryType.COMMISSION] },
                  '$amount',
                  0,
                ],
              },
            },
            totalOrders: {
              $sum: {
                $cond: [{ $eq: ['$type', LedgerEntryType.SALE] }, 1, 0],
              },
            },
          },
        },
      ];

      const [analytics] = await this.ledgerEntryModel.aggregate(pipeline);

      if (!analytics) {
        return this.createEmptyAnalytics(
          vendorId,
          analyticsDto.period,
          startDate,
          endDate,
        );
      }

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
      // Combine ledger and payout queries for better performance
      const [ledgerSummary, payoutSummary, lastPayout] = await Promise.all([
        // Single aggregation for ledger entries
        this.ledgerEntryModel.aggregate([
          {
            $match: {
              vendorId: new Types.ObjectId(vendorId),
              status: LedgerEntryStatus.COMPLETED,
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$type',
                        [LedgerEntryType.SALE, LedgerEntryType.ADJUSTMENT],
                      ],
                    },
                    '$amount',
                    0,
                  ],
                },
              },
              totalCommission: {
                $sum: {
                  $cond: [
                    { $eq: ['$type', LedgerEntryType.COMMISSION] },
                    '$amount',
                    0,
                  ],
                },
              },
            },
          },
        ]),
        // Single aggregation for payout summary
        this.payoutModel.aggregate([
          {
            $match: {
              vendorId: new Types.ObjectId(vendorId),
            },
          },
          {
            $group: {
              _id: null,
              pendingPayouts: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$status',
                        [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
                      ],
                    },
                    '$amount',
                    0,
                  ],
                },
              },
              completedPayouts: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', PayoutStatus.COMPLETED] },
                    '$amount',
                    0,
                  ],
                },
              },
            },
          },
        ]),
        // Get last payout
        this.payoutModel
          .findOne(
            {
              vendorId: new Types.ObjectId(vendorId),
              status: PayoutStatus.COMPLETED,
            },
            {},
            { sort: { completedAt: -1 } },
          )
          .exec(),
      ]);

      const totalEarnings = ledgerSummary[0]?.totalEarnings || 0;
      const totalCommission = ledgerSummary[0]?.totalCommission || 0;
      const pendingPayoutAmount = payoutSummary[0]?.pendingPayouts || 0;
      const completedPayoutAmount = payoutSummary[0]?.completedPayouts || 0;
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
        lastPayoutDate: lastPayout?.completedAt,
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

      const payout = new this.payoutModel({
        vendorId: new Types.ObjectId(vendorId),
        amount: createDto.amount,
        method: createDto.method,
        bankDetails: createDto.bankDetails,
        upiDetails: createDto.upiDetails,
        status: PayoutStatus.PENDING,
      });

      const savedPayout = await payout.save();

      this.customLogger.logBusinessEvent(
        'payout_requested',
        {
          payoutId: savedPayout._id,
          vendorId,
          amount: createDto.amount,
          method: createDto.method,
        },
        vendorId,
      );

      return this.mapPayoutToResponseDto(savedPayout);
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
      const filter: any = { vendorId: new Types.ObjectId(vendorId) };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const [payouts, total] = await Promise.all([
        this.payoutModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.payoutModel.countDocuments(filter),
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
  private mapToResponseDto(entry: LedgerEntryDocument): LedgerEntryResponseDto {
    return {
      id: entry._id.toString(),
      vendorId: entry.vendorId.toString(),
      orderId: entry.orderId.toString(),
      userId: entry.userId?.toString() || '',
      amount: entry.amount,
      type: entry.type as LedgerEntryType,
      status: entry.status as LedgerEntryStatus,
      description: entry.description,
      referenceId: entry.referenceId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private mapPayoutToResponseDto(payout: PayoutDocument): PayoutResponseDto {
    return {
      id: payout._id.toString(),
      vendorId: payout.vendorId.toString(),
      amount: payout.amount,
      status: payout.status as PayoutStatus,
      method: payout.method as PayoutMethod,
      bankDetails: payout.payoutDetails
        ? {
            accountNumber: payout.payoutDetails.bankAccountNumber || '',
            ifscCode: payout.payoutDetails.ifscCode || '',
            accountHolderName: payout.payoutDetails.accountHolderName || '',
            bankName: payout.payoutDetails.bankName || '',
          }
        : undefined,
      upiDetails: payout.payoutDetails?.upiId
        ? {
            upiId: payout.payoutDetails.upiId,
            name: payout.payoutDetails.accountHolderName || '',
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
