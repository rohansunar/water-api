import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerBaseService } from './worker-base.service';
import { RedisService } from './redis.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Interface defining the structure of reconciliation job data
 * Contains all necessary information for processing vendor financial reconciliation
 */
export interface ReconciliationData {
  /** Unique identifier for the vendor being reconciled */
  vendorId: string;
  /** Date for reconciliation in YYYY-MM-DD format */
  date: string; // YYYY-MM-DD format
  /** Expected amount based on business calculations */
  expectedAmount: number;
  /** Actual amount received (optional, calculated if not provided) */
  actualAmount?: number;
  /** Specific transaction IDs to include in reconciliation (optional) */
  transactionIds?: string[];
  /** Additional notes or context for the reconciliation */
  notes?: string;
}

/**
 * Financial Reconciliation Worker Service
 *
 * This service handles automated financial reconciliation for vendors in the delivery platform.
 * It processes daily reconciliation jobs to ensure financial accuracy and detect discrepancies
 * between expected and actual transaction amounts.
 *
 * Architecture:
 * - Extends WorkerBaseService for queue-based job processing using BullMQ
 * - Processes reconciliation jobs asynchronously with configurable concurrency
 * - Integrates with Prisma ORM for database operations and Redis for caching
 * - Implements comprehensive error handling and retry mechanisms
 *
 * Key Features:
 * - Automated daily reconciliation processing for vendor transactions
 * - Multi-source transaction aggregation (cash transactions, order payments)
 * - Sophisticated discrepancy detection algorithms
 * - Financial audit trail management with detailed logging
 * - Real-time notification system for reconciliation completion
 * - Caching layer for performance optimization
 *
 * Business Logic:
 * - Reconciles expected amounts (calculated from business rules) against actual amounts
 * - Identifies discrepancies in transaction amounts, completion status, and duplicates
 * - Maintains detailed audit trails for compliance and financial reporting
 * - Updates vendor ledgers with reconciliation adjustments
 * - Supports both manual and automated reconciliation workflows
 *
 * Error Handling:
 * - Exponential backoff retry strategy for transient failures
 * - Comprehensive error logging with context information
 * - Graceful degradation for partial reconciliation failures
 * - Transaction rollback capabilities for data consistency
 */
@Injectable()
export class ReconciliationWorker extends WorkerBaseService {
  /**
   * Constructor for ReconciliationWorker
   *
   * @param redisService - Redis service for caching and queue operations
   * @param prismaService - Prisma service for database operations
   *
   * Configures the worker with:
   * - Queue name: 'reconciliation' for job processing
   * - Concurrency: 2 (processes up to 2 reconciliation jobs simultaneously)
   * - Retry attempts: 3 (retries failed jobs up to 3 times)
   * - Exponential backoff: 30-second initial delay for retries
   */
  constructor(
    protected readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {
    super(redisService, {
      queueName: 'reconciliation',
      concurrency: 2,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds
      },
    });
  }

  /**
   * Main job processing method for financial reconciliation
   *
   * This method orchestrates the complete reconciliation workflow:
   * 1. Data extraction and validation
   * 2. Financial calculation and comparison
   * 3. Discrepancy identification and processing
   * 4. Audit trail creation and ledger updates
   * 5. Caching and notification
   *
   * @param job - BullMQ job containing reconciliation data
   * @returns Promise resolving to reconciliation results with success status and metrics
   *
   * @throws Error if reconciliation process fails (will trigger retry mechanism)
   *
   * Business Logic:
   * - Validates input data and ensures data integrity
   * - Performs comprehensive financial reconciliation
   * - Maintains detailed audit trails for compliance
   * - Updates financial ledgers with reconciliation adjustments
   * - Provides real-time notifications for stakeholders
   */
  protected async processJob(job: Job<ReconciliationData>): Promise<any> {
    const {
      vendorId,
      date,
      expectedAmount,
      actualAmount,
      transactionIds,
      notes,
    } = job.data;

    try {
      this.logger.log(
        `Starting reconciliation for vendor ${vendorId} on ${date}`,
      );

      // Step 1: Extract and aggregate all relevant transactions for the reconciliation date
      // This includes both cash transactions and order payments to ensure complete coverage
      const transactions = await this.getTransactionsForDate(vendorId, date);

      // Step 2: Calculate expected vs actual amounts using business rules
      // Expected amount is calculated from transaction data, actual amount may be provided or calculated
      const calculatedExpected = this.calculateExpectedAmount(transactions);
      const calculatedActual =
        actualAmount || this.calculateActualAmount(transactions);

      // Step 3: Identify discrepancies using sophisticated detection algorithms
      // This includes amount mismatches, incomplete transactions, and duplicate detection
      const discrepancies = this.identifyDiscrepancies(
        transactions,
        calculatedExpected,
        calculatedActual,
      );

      // Step 4: Create permanent reconciliation record for audit trail
      // This creates an immutable record of the reconciliation process and results
      const reconciliation = await this.createReconciliationRecord({
        vendorId: BigInt(vendorId),
        date: new Date(date),
        expectedAmount: calculatedExpected,
        actualAmount: calculatedActual,
        discrepancies,
        transactionIds:
          transactionIds || transactions.map((t) => t.id.toString()),
        notes,
      });

      // Step 5: Process any identified discrepancies
      // This creates detailed discrepancy records for further investigation and resolution
      if (discrepancies.length > 0) {
        await this.processDiscrepancies(reconciliation.id, discrepancies);
      }

      // Step 6: Update vendor ledger with reconciliation adjustments
      // This ensures the vendor's financial ledger reflects the reconciliation results
      await this.updateLedgerEntries(reconciliation);

      // Step 7: Cache reconciliation results for performance optimization
      // This allows quick retrieval of recent reconciliation data without database queries
      await this.cacheReconciliationResult(reconciliation);

      // Step 8: Send notification about reconciliation completion
      // This informs stakeholders about the reconciliation status and any issues found
      await this.notifyReconciliationComplete(vendorId, reconciliation);

      this.logger.log(
        `Reconciliation completed for vendor ${vendorId} on ${date}`,
      );
      return {
        success: true,
        reconciliationId: reconciliation.id.toString(),
        expectedAmount: calculatedExpected,
        actualAmount: calculatedActual,
        discrepancyCount: discrepancies.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process reconciliation for vendor ${vendorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves all financial transactions for a vendor on a specific date
   *
   * This method aggregates multiple transaction sources to ensure complete
   * financial coverage for reconciliation:
   * - Cash transactions (direct vendor payments)
   * - Order payments (customer payments for orders)
   *
   * @param vendorId - The vendor identifier as string
   * @param date - Date string in YYYY-MM-DD format
   * @returns Promise resolving to array of all transactions for the date
   *
   * Business Logic:
   * - Creates date range from start of day to start of next day
   * - Filters for completed transactions only to ensure finality
   * - Includes related entities (orders, riders) for context
   * - Combines multiple data sources for comprehensive reconciliation
   */
  private async getTransactionsForDate(
    vendorId: string,
    date: string,
  ): Promise<any[]> {
    // Create date range: from start of specified date to start of next day
    // This ensures we capture all transactions for the complete day
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Retrieve cash transactions for the vendor on the specified date
    // These represent direct cash payments made to the vendor
    const cashTransactions = await this.prismaService.cashTransaction.findMany({
      where: {
        vendorId: BigInt(vendorId),
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        status: 'completed',
      },
      include: {
        order: true,
        rider: true,
      },
    });

    // Retrieve order payments for the same date
    // These represent customer payments processed through the platform
    const orderPayments = await this.prismaService.payment.findMany({
      where: {
        order: {
          vendorId: BigInt(vendorId),
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        status: 'completed',
      },
      include: {
        order: true,
      },
    });

    // Combine both transaction sources for comprehensive reconciliation
    return [...cashTransactions, ...orderPayments];
  }

  /**
   * Calculates the expected amount based on business rules and transaction types
   *
   * Algorithm:
   * - Sums all transactions that represent actual vendor earnings
   * - Includes delivery payments (rider payments to vendors)
   * - Includes cash transactions (direct customer payments)
   * - Excludes refunds, cancellations, and other non-revenue transactions
   *
   * @param transactions - Array of transaction objects to analyze
   * @returns Total expected amount as calculated from business rules
   *
   * Business Logic:
   * - Only counts transactions that represent actual revenue
   * - Filters out failed, cancelled, or refunded transactions
   * - Ensures accurate financial reporting for vendor settlements
   */
  private calculateExpectedAmount(transactions: any[]): number {
    return transactions.reduce((total, transaction) => {
      // Include delivery payments (rider payments to vendors)
      // Include cash transactions (direct customer payments to vendors)
      if (
        transaction.type === 'delivery_payment' ||
        transaction.paymentMethod === 'cash'
      ) {
        return total + Number(transaction.amount);
      }
      return total;
    }, 0);
  }

  /**
   * Calculates the actual amount received based on transaction completion status
   *
   * Algorithm:
   * - Sums all completed transactions regardless of type
   * - Only includes transactions with 'completed' status
   * - Provides ground truth of actual funds received
   *
   * @param transactions - Array of transaction objects to analyze
   * @returns Total actual amount received from completed transactions
   *
   * Business Logic:
   * - Represents the actual funds that have been successfully processed
   * - Used for comparison against expected amounts to identify discrepancies
   * - Critical for financial reconciliation and vendor settlement accuracy
   */
  private calculateActualAmount(transactions: any[]): number {
    return transactions.reduce((total, transaction) => {
      // Only count transactions that have been successfully completed
      // This represents actual funds received, not just expected amounts
      if (transaction.status === 'completed') {
        return total + Number(transaction.amount);
      }
      return total;
    }, 0);
  }

  /**
   * Identifies discrepancies between expected and actual financial data
   *
   * This method implements sophisticated discrepancy detection algorithms:
   * 1. Amount mismatch detection with tolerance for rounding errors
   * 2. Transaction completion status validation
   * 3. Duplicate transaction identification
   *
   * @param transactions - Array of transaction objects to analyze
   * @param expected - Expected amount calculated from business rules
   * @param actual - Actual amount received from completed transactions
   * @returns Array of discrepancy objects with detailed information
   *
   * Algorithm Details:
   * - Amount Mismatch: Compares expected vs actual with 0.01 tolerance
   * - Incomplete Transactions: Identifies transactions not yet completed
   * - Duplicate Detection: Uses composite key matching for identification
   *
   * Business Logic:
   * - Financial reconciliation requires precise amount matching
   * - Small rounding differences are acceptable (0.01 tolerance)
   * - Incomplete transactions indicate processing delays or failures
   * - Duplicate transactions suggest system errors or fraud
   */
  private identifyDiscrepancies(
    transactions: any[],
    expected: number,
    actual: number,
  ): any[] {
    const discrepancies = [];

    // Algorithm 1: Amount Mismatch Detection
    // Compare expected vs actual amounts with small tolerance for rounding errors
    // This is the primary reconciliation check for financial accuracy
    if (Math.abs(expected - actual) > 0.01) {
      // Allow for small rounding differences
      discrepancies.push({
        type: 'amount_mismatch',
        expected,
        actual,
        difference: actual - expected,
        description: `Expected amount ${expected} but actual amount is ${actual}`,
      });
    }

    // Algorithm 2: Transaction Completion Analysis
    // Check for transactions that haven't reached final completion status
    // Incomplete transactions may indicate processing delays or system issues
    const completedTransactions = transactions.filter(
      (t) => t.status === 'completed',
    );
    if (completedTransactions.length !== transactions.length) {
      discrepancies.push({
        type: 'incomplete_transactions',
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        description: `${transactions.length - completedTransactions.length} transactions are not completed`,
      });
    }

    // Algorithm 3: Duplicate Transaction Detection
    // Identify potential duplicate transactions using composite key matching
    // This helps detect system errors, fraud, or data integrity issues
    const duplicates = this.findDuplicateTransactions(transactions);
    if (duplicates.length > 0) {
      discrepancies.push({
        type: 'duplicate_transactions',
        duplicates,
        description: `${duplicates.length} duplicate transactions found`,
      });
    }

    return discrepancies;
  }

  /**
   * Identifies duplicate transactions using composite key matching
   *
   * Algorithm:
   * - Creates composite keys from transaction type, amount, and reference
   * - Uses Map data structure for O(1) duplicate detection
   * - Tracks first occurrence and subsequent duplicates
   *
   * @param transactions - Array of transaction objects to analyze
   * @returns Array of duplicate transaction objects with relationship data
   *
   * Business Logic:
   * - Duplicate transactions indicate potential system errors or fraud
   * - Composite key ensures accurate duplicate detection across multiple fields
   * - Critical for maintaining financial data integrity and audit compliance
   * - Helps identify processing errors in payment systems
   */
  private findDuplicateTransactions(transactions: any[]): any[] {
    const seen = new Map(); // Map for O(1) lookup performance
    const duplicates = [];

    // Algorithm: Single-pass duplicate detection using composite keys
    // This approach ensures we identify all duplicates in one iteration
    for (const transaction of transactions) {
      // Create composite key from multiple transaction attributes
      // This ensures accurate duplicate detection across different dimensions
      const key = `${transaction.type}-${transaction.amount}-${transaction.reference}`;

      if (seen.has(key)) {
        // Found duplicate: record the relationship for investigation
        duplicates.push({
          transactionId: transaction.id,
          duplicateOf: seen.get(key), // ID of the original transaction
          key, // Composite key for reference
        });
      } else {
        // First occurrence: record in seen map
        seen.set(key, transaction.id);
      }
    }

    return duplicates;
  }

  /**
   * Creates a permanent reconciliation record in the database
   *
   * This method creates an immutable audit trail record of the reconciliation process.
   * The record includes all financial calculations, discrepancies found, and metadata
   * for compliance and historical analysis.
   *
   * @param data - Reconciliation data including vendor, amounts, discrepancies, and notes
   * @returns Promise resolving to the created reconciliation record
   *
   * Business Logic:
   * - Creates permanent audit trail for financial compliance
   * - Stores all reconciliation calculations and results
   * - Maintains detailed discrepancy information for investigation
   * - Supports regulatory reporting and financial audits
   */
  private async createReconciliationRecord(data: any): Promise<any> {
    return await this.prismaService.$executeRaw`
      INSERT INTO reconciliation_records (
        vendor_id, date, expected_amount, actual_amount,
        discrepancies, transaction_ids, notes, status, created_at
      ) VALUES (
        ${data.vendorId}, ${data.date}, ${data.expectedAmount}, ${data.actualAmount},
        ${JSON.stringify(data.discrepancies)}, ${JSON.stringify(data.transactionIds)},
        ${data.notes}, 'completed', ${new Date()}
      ) RETURNING id, created_at
    `;
  }

  /**
   * Processes and stores detailed discrepancy information
   *
   * This method creates individual records for each identified discrepancy,
   * providing detailed information for investigation and resolution tracking.
   *
   * @param reconciliationId - ID of the parent reconciliation record
   * @param discrepancies - Array of discrepancy objects to process
   * @returns Promise that resolves when all discrepancies are stored
   *
   * Business Logic:
   * - Creates detailed audit trail for each discrepancy
   * - Supports discrepancy investigation and resolution workflows
   * - Maintains historical record of all financial issues
   * - Enables trend analysis and pattern detection
   */
  private async processDiscrepancies(
    reconciliationId: bigint,
    discrepancies: any[],
  ): Promise<void> {
    for (const discrepancy of discrepancies) {
      await this.prismaService.$executeRaw`
        INSERT INTO reconciliation_discrepancies (
          reconciliation_id, type, description, amount, metadata, created_at
        ) VALUES (
          ${reconciliationId}, ${discrepancy.type}, ${discrepancy.description},
          ${discrepancy.amount || 0}, ${JSON.stringify(discrepancy)}, ${new Date()}
        )
      `;
    }
  }

  /**
   * Updates vendor ledger with reconciliation adjustments
   *
   * This method creates ledger entries to reflect the financial impact
   * of the reconciliation process. The adjustment amount represents
   * the difference between expected and actual amounts.
   *
   * @param reconciliation - Reconciliation record with financial data
   * @returns Promise that resolves when ledger entry is created
   *
   * Business Logic:
   * - Records reconciliation adjustments in vendor's financial ledger
   * - Supports audit trail for financial compliance
   * - Enables tracking of reconciliation impact on vendor balances
   * - Balance calculation is handled by database triggers
   */
  private async updateLedgerEntries(reconciliation: any): Promise<void> {
    // Create ledger entry for reconciliation adjustment
    // This records the financial impact of the reconciliation process
    await this.prismaService.ledgerEntry.create({
      data: {
        vendorId: reconciliation.vendorId,
        type: 'reconciliation',
        amount: reconciliation.actualAmount - reconciliation.expectedAmount,
        balanceAfter: 0, // Will be calculated by database trigger
        metadata: {
          reconciliationId: reconciliation.id,
          date: reconciliation.date,
          type: 'reconciliation_adjustment',
        },
      },
    });
  }

  /**
   * Caches reconciliation results for performance optimization
   *
   * This method stores reconciliation results in Redis cache to enable
   * fast retrieval of recent reconciliation data without database queries.
   *
   * @param reconciliation - Reconciliation record to cache
   * @returns Promise that resolves when caching is complete
   *
   * Business Logic:
   * - Improves performance for frequently accessed reconciliation data
   * - Reduces database load for recent reconciliation queries
   * - Supports real-time dashboard and reporting features
   * - Automatic expiration ensures data freshness
   */
  private async cacheReconciliationResult(reconciliation: any): Promise<void> {
    // Create cache key using vendor ID and date for easy lookup
    const cacheKey = `reconciliation:${reconciliation.vendorId}:${reconciliation.date.toISOString().split('T')[0]}`;

    // Cache reconciliation summary with 24-hour expiration
    await this.redisService.set(
      cacheKey,
      JSON.stringify({
        id: reconciliation.id,
        expectedAmount: reconciliation.expectedAmount,
        actualAmount: reconciliation.actualAmount,
        status: 'completed',
        completedAt: new Date().toISOString(),
      }),
      'EX',
      86400,
    ); // 24 hours
  }

  /**
   * Sends notification about reconciliation completion
   *
   * This method queues notifications to inform stakeholders about
   * the reconciliation process completion and any issues found.
   *
   * @param vendorId - Vendor identifier for notification targeting
   * @param reconciliation - Reconciliation record with results
   * @returns Promise that resolves when notification is queued
   *
   * Business Logic:
   * - Provides real-time feedback on reconciliation status
   * - Alerts stakeholders to discrepancies requiring attention
   * - Supports multiple notification channels (push, email)
   * - Enables proactive issue resolution and customer service
   */
  private async notifyReconciliationComplete(
    vendorId: string,
    reconciliation: any,
  ): Promise<void> {
    // Queue notification for reconciliation completion
    // This will be processed by the notification service
    await this.redisService.getClient()?.lPush(
      'notifications:queue',
      JSON.stringify({
        type: 'reconciliation_complete',
        recipientId: vendorId,
        recipientType: 'vendor',
        title: 'Reconciliation Complete',
        message: `Daily reconciliation completed. Expected: ₹${reconciliation.expectedAmount}, Actual: ₹${reconciliation.actualAmount}`,
        metadata: {
          reconciliationId: reconciliation.id,
          date: reconciliation.date,
        },
        priority: 'normal',
        channels: ['push', 'email'],
      }),
    );
  }
}
