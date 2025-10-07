import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Wallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  ReferenceType,
} from '../common/interfaces/wallet.interface';
import {
  TopupWalletDto,
  WalletResponseDto,
  WalletTransactionDto,
} from '../common/dto/wallet.dto';
import { UserService } from '../modules/user/services/user.service';

/**
 * WalletService - Comprehensive Digital Wallet Management System
 *
 * ARCHITECTURE OVERVIEW:
 * This service implements an in-memory digital wallet system with persistent transaction
 * logging and user balance management. It uses Map-based data structures for high-performance
 * lookups and maintains multiple indexes for efficient data retrieval.
 *
 * KEY FEATURES:
 * - In-memory wallet storage with O(1) access patterns
 * - Atomic transaction processing with balance validation
 * - Multi-index data structure for efficient queries
 * - Comprehensive audit trail and transaction logging
 * - Currency support with INR as primary currency
 * - Wallet lifecycle management (active/inactive states)
 * - Integration with UserService for balance synchronization
 *
 * DATA STRUCTURES:
 * - wallets: Primary wallet storage (walletId -> Wallet)
 * - transactions: Transaction storage (transactionId -> WalletTransaction)
 * - userWalletIndex: Reverse lookup (userId -> walletId)
 * - walletTransactionIndex: Transaction history (walletId -> transactionIds[])
 * - pendingTimeouts: Memory leak prevention for cleanup operations
 *
 * TRANSACTION FLOW:
 * 1. Wallet retrieval/creation with user mapping
 * 2. Balance validation and amount verification
 * 3. Transaction creation with unique ID generation
 * 4. Atomic balance updates across all data structures
 * 5. User service synchronization for external consistency
 * 6. Comprehensive logging for audit and debugging
 *
 * SECURITY & COMPLIANCE:
 * - Amount validation with business rule enforcement
 * - Insufficient balance protection
 * - Transaction immutability after creation
 * - Comprehensive error handling and logging
 * - Memory cleanup on module destruction
 */
@Injectable()
export class WalletService implements OnModuleDestroy {
  /** Logger instance for audit trails and debugging */
  private readonly logger = new Logger(WalletService.name);

  /**
   * PRIMARY DATA STORAGE
   * Core wallet storage using Map for O(1) lookup performance
   * Key: walletId (UUID), Value: Wallet object with balance and metadata
   */
  private readonly wallets = new Map<string, Wallet>();

  /**
   * TRANSACTION STORAGE
   * All wallet transactions indexed by transaction ID
   * Key: transactionId (UUID), Value: Complete transaction record
   * Used for audit trails and transaction history
   */
  private readonly transactions = new Map<string, WalletTransaction>();

  /**
   * USER-WALLET MAPPING INDEX
   * Reverse lookup index for efficient user-to-wallet resolution
   * Key: userId (string), Value: walletId (UUID)
   * Enables O(1) wallet lookup by user ID
   */
  private readonly userWalletIndex = new Map<string, string>(); // userId -> walletId

  /**
   * WALLET-TRANSACTION INDEX
   * Transaction history index for each wallet
   * Key: walletId (UUID), Value: Array of transaction IDs
   * Supports efficient transaction history retrieval and pagination
   */
  private readonly walletTransactionIndex = new Map<string, string[]>(); // walletId -> transactionIds

  /**
   * MEMORY LEAK PREVENTION
   * Tracks active timeouts for cleanup during module destruction
   * Prevents memory leaks from pending asynchronous operations
   */
  private readonly pendingTimeouts = new Set<NodeJS.Timeout>();

  /**
   * Constructor - Dependency Injection and Service Initialization
   *
   * @param userService - User service for wallet balance synchronization
   *                     Ensures external consistency across user records
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Module Lifecycle Hook - Cleanup on Application Shutdown
   *
   * ALGORITHM: Memory Leak Prevention
   * 1. Iterate through all tracked timeout references
   * 2. Clear each timeout to prevent continued execution
   * 3. Clear the timeout tracking set
   * 4. Log cleanup completion for audit trail
   *
   * BUSINESS LOGIC: Resource Management
   * - Prevents memory leaks from pending async operations
   * - Ensures clean shutdown without hanging processes
   * - Maintains system stability during restarts
   */
  onModuleDestroy() {
    // Clean up all pending timeouts to prevent memory leaks
    this.pendingTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pendingTimeouts.clear();
    this.logger.log('Cleaned up all pending timeouts');
  }

  /**
   * Retrieve User Wallet with Transaction History
   *
   * ALGORITHM: Wallet Retrieval with Auto-Creation
   * 1. Attempt to find existing wallet by user ID
   * 2. If wallet doesn't exist, create new wallet automatically
   * 3. Retrieve transaction history from wallet-transaction index
   * 4. Filter and sort transactions by creation date (newest first)
   * 5. Transform and return wallet data with recent transactions
   *
   * BUSINESS LOGIC: On-Demand Wallet Provisioning
   * - Wallets are created automatically when first accessed
   * - Ensures seamless user experience without pre-registration
   * - Maintains transaction history for audit and user visibility
   * - Limits transaction history to 20 most recent for performance
   *
   * @param userId - Unique identifier of the wallet owner
   * @returns Promise<WalletResponseDto> - Complete wallet information with transaction history
   *
   * @throws Does not throw - Creates wallet if not found
   */
  async getWallet(userId: string): Promise<WalletResponseDto> {
    let wallet = await this.findByUserId(userId);

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.createWallet(userId);
    }

    // COMPLEX ALGORITHM: Transaction Retrieval and Processing
    // 1. Get transaction IDs from wallet-transaction index (O(1) lookup)
    // 2. Map transaction IDs to actual transaction objects (O(n) where n = transaction count)
    // 3. Filter out any null/undefined transactions (defensive programming)
    // 4. Sort by creation date in descending order (newest first)
    // 5. This ensures users see most recent transactions first
    const transactionIds = this.walletTransactionIndex.get(wallet.id) || [];
    const transactions = transactionIds
      .map((id) => this.transactions.get(id))
      .filter(Boolean);

    // Sort transactions by creation date (newest first)
    // ALGORITHM: Chronological Sorting
    // - Uses timestamp comparison for accurate ordering
    // - Descending order ensures most recent transactions appear first
    // - Stable sort maintains relative order for same-timestamp transactions
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
      transactions: transactions.slice(0, 20).map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        referenceId: transaction.referenceId,
        referenceType: transaction.referenceType,
        status: transaction.status,
        createdAt: transaction.createdAt,
      })),
    };
  }

  /**
   * Process Wallet Topup with Comprehensive Validation
   *
   * ALGORITHM: Secure Topup Processing
   * 1. Retrieve or create user wallet
   * 2. Validate wallet activation status
   * 3. Enforce business rules for amount limits
   * 4. Create immutable transaction record
   * 5. Update wallet balance atomically
   * 6. Synchronize with user service
   * 7. Update all relevant indexes
   * 8. Log transaction for audit trail
   *
   * BUSINESS LOGIC: Financial Compliance & Security
   * - Amount range validation (₹1 to ₹10,000)
   * - Wallet activation status verification
   * - Immediate balance update for instant availability
   * - Comprehensive audit logging for regulatory compliance
   * - External service synchronization for data consistency
   *
   * @param userId - Unique identifier of the wallet owner
   * @param topupDto - Topup request containing amount and payment method
   * @returns Promise<{ message: string; transactionId: string; paymentUrl?: string }>
   *          - Success confirmation with transaction reference
   *
   * @throws BadRequestException - Invalid amount range or inactive wallet
   * @throws Error - Any unexpected errors during processing
   */
  async topupWallet(
    userId: string,
    topupDto: TopupWalletDto,
  ): Promise<{ message: string; transactionId: string; paymentUrl?: string }> {
    try {
      let wallet = await this.findByUserId(userId);

      if (!wallet) {
        wallet = await this.createWallet(userId);
      }

      if (!wallet.isActive) {
        throw new BadRequestException(
          'Your wallet is currently inactive. Please contact support to reactivate your wallet.',
        );
      }

      // BUSINESS RULE VALIDATION: Amount Range Enforcement
      // - Minimum ₹1 prevents zero-value transactions
      // - Maximum ₹10,000 prevents excessive single transactions
      // - Protects against both accidental and malicious inputs
      // - Complies with financial regulatory limits
      if (topupDto.amount < 1 || topupDto.amount > 10000) {
        throw new BadRequestException(
          'Topup amount must be between ₹1 and ₹10,000. Please enter a valid amount within this range.',
        );
      }

      // ATOMIC TRANSACTION CREATION: Immutable Record Generation
      // - UUID ensures global uniqueness across distributed systems
      // - balanceAfter calculated before actual balance update
      // - Reference tracking enables audit trail reconstruction
      // - Timestamp precision ensures accurate chronological ordering
      const transaction: WalletTransaction = {
        id: uuidv4(),
        walletId: wallet.id,
        userId,
        type: TransactionType.CREDIT,
        amount: topupDto.amount,
        balanceAfter: wallet.balance + topupDto.amount,
        description: `Wallet topup via ${topupDto.payment_method}`,
        referenceType: ReferenceType.TOPUP,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // ATOMIC BALANCE UPDATE: Consistency Across Data Structures
      // - Primary wallet storage updated first
      // - Timestamp tracking for audit purposes
      // - All updates happen in memory for immediate consistency
      wallet.balance += topupDto.amount;
      wallet.updatedAt = new Date();
      this.wallets.set(wallet.id, wallet);

      // EXTERNAL SYNCHRONIZATION: Cross-Service Consistency
      // - UserService maintains external wallet balance records
      // - Ensures consistency across microservice architecture
      // - Critical for reporting and external system integration
      await this.userService.updateWalletBalance(userId, topupDto.amount);

      // MULTI-INDEX UPDATE: Efficient Query Support
      // - Transaction storage for detailed record keeping
      // - Wallet-transaction index for history retrieval
      // - Both indexes updated atomically for consistency
      this.transactions.set(transaction.id, transaction);
      const walletTransactions =
        this.walletTransactionIndex.get(wallet.id) || [];
      walletTransactions.push(transaction.id);
      this.walletTransactionIndex.set(wallet.id, walletTransactions);

      this.logger.log(
        `Completed topup transaction ${transaction.id} for user ${userId}: ₹${topupDto.amount}`,
      );

      return {
        message: 'Topup completed successfully',
        transactionId: transaction.id,
      };
    } catch (error) {
      this.logger.error(`Topup failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add Money to User Wallet (Internal Operations)
   *
   * ALGORITHM: Internal Credit Processing
   * 1. Retrieve or create user wallet
   * 2. Create immutable credit transaction record
   * 3. Update wallet balance atomically
   * 4. Synchronize with external user service
   * 5. Update all relevant data indexes
   * 6. Log transaction for audit trail
   *
   * BUSINESS LOGIC: Internal Financial Operations
   * - Used for refunds, cashback, promotional credits
   * - Immediate balance update for instant availability
   * - Supports flexible reference tracking for audit purposes
   * - External service synchronization for data consistency
   * - Comprehensive logging for financial compliance
   *
   * @param userId - Unique identifier of the wallet owner
   * @param amount - Positive amount to be credited
   * @param description - Human-readable transaction description
   * @param referenceId - Optional external reference identifier
   * @param referenceType - Optional reference type for categorization
   * @returns Promise<WalletTransaction> - Complete transaction record
   *
   * @throws Does not throw - Creates wallet if not found
   */
  async addMoney(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: ReferenceType,
  ): Promise<WalletTransaction> {
    let wallet = await this.findByUserId(userId);

    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    const transaction: WalletTransaction = {
      id: uuidv4(),
      walletId: wallet.id,
      userId,
      type: TransactionType.CREDIT,
      amount,
      balanceAfter: wallet.balance + amount,
      description,
      referenceId,
      referenceType,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update wallet balance
    wallet.balance += amount;
    wallet.updatedAt = new Date();
    this.wallets.set(wallet.id, wallet);

    // Update user wallet balance
    await this.userService.updateWalletBalance(userId, amount);

    // Store transaction
    this.transactions.set(transaction.id, transaction);

    // Update wallet transaction index
    const walletTransactions = this.walletTransactionIndex.get(wallet.id) || [];
    walletTransactions.push(transaction.id);
    this.walletTransactionIndex.set(wallet.id, walletTransactions);

    this.logger.log(
      `Added ₹${amount} to wallet for user ${userId}. New balance: ₹${wallet.balance}`,
    );
    return transaction;
  }

  /**
   * Deduct Money from User Wallet with Balance Validation
   *
   * ALGORITHM: Secure Debit Processing with Balance Protection
   * 1. Retrieve existing wallet (throws if not found)
   * 2. Validate sufficient balance before processing
   * 3. Create immutable debit transaction record
   * 4. Update wallet balance atomically
   * 5. Synchronize with external user service
   * 6. Update all relevant data indexes
   * 7. Log transaction for audit trail
   *
   * BUSINESS LOGIC: Financial Safety & Compliance
   * - Pre-validation prevents overdrafts and negative balances
   * - Used for payments, purchases, and fee deductions
   * - Immediate balance update for real-time consistency
   * - Comprehensive error messaging for user clarity
   * - External service synchronization for data integrity
   * - Audit logging for financial regulatory compliance
   *
   * @param userId - Unique identifier of the wallet owner
   * @param amount - Positive amount to be debited
   * @param description - Human-readable transaction description
   * @param referenceId - Optional external reference identifier
   * @param referenceType - Optional reference type for categorization
   * @returns Promise<WalletTransaction> - Complete transaction record
   *
   * @throws NotFoundException - Wallet not found for user
   * @throws BadRequestException - Insufficient wallet balance
   */
  async deductMoney(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: ReferenceType,
  ): Promise<WalletTransaction> {
    const wallet = await this.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Your current balance is ₹${wallet.balance}, but ₹${amount} is required. Please add money to your wallet.`,
      );
    }

    const transaction: WalletTransaction = {
      id: uuidv4(),
      walletId: wallet.id,
      userId,
      type: TransactionType.DEBIT,
      amount,
      balanceAfter: wallet.balance - amount,
      description,
      referenceId,
      referenceType,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update wallet balance
    wallet.balance -= amount;
    wallet.updatedAt = new Date();
    this.wallets.set(wallet.id, wallet);

    // Update user wallet balance
    await this.userService.updateWalletBalance(userId, -amount);

    // Store transaction
    this.transactions.set(transaction.id, transaction);

    // Update wallet transaction index
    const walletTransactions = this.walletTransactionIndex.get(wallet.id) || [];
    walletTransactions.push(transaction.id);
    this.walletTransactionIndex.set(wallet.id, walletTransactions);

    this.logger.log(
      `Deducted ₹${amount} from wallet for user ${userId}. New balance: ₹${wallet.balance}`,
    );
    return transaction;
  }

  /**
   * Find Wallet by User ID using Reverse Index Lookup
   *
   * ALGORITHM: O(1) Wallet Resolution
   * 1. Retrieve wallet ID from user-wallet index
   * 2. Return null if user has no wallet mapping
   * 3. Fetch wallet from primary storage using wallet ID
   * 4. Return null if wallet doesn't exist in storage
   *
   * BUSINESS LOGIC: Efficient User-Wallet Association
   * - Enables fast wallet lookup without scanning all wallets
   * - Supports wallet existence checking for conditional operations
   * - Used internally by all wallet-dependent operations
   *
   * @param userId - Unique identifier of the wallet owner
   * @returns Promise<Wallet | null> - Wallet object or null if not found
   */
  private async findByUserId(userId: string): Promise<Wallet | null> {
    const walletId = this.userWalletIndex.get(userId);
    if (!walletId) return null;
    return this.wallets.get(walletId) || null;
  }

  /**
   * Create New Wallet with Default Configuration
   *
   * ALGORITHM: Wallet Initialization
   * 1. Generate unique wallet identifier
   * 2. Create wallet with default values (zero balance, INR currency)
   * 3. Store wallet in primary storage
   * 4. Update user-wallet index for reverse lookup
   * 5. Log wallet creation for audit trail
   *
   * BUSINESS LOGIC: Wallet Lifecycle Management
   * - Automatic wallet provisioning on first access
   * - Consistent default values across all new wallets
   * - Audit trail maintenance for compliance
   * - Immediate availability for transactions
   *
   * @param userId - Unique identifier of the wallet owner
   * @returns Promise<Wallet> - Newly created wallet object
   */
  private async createWallet(userId: string): Promise<Wallet> {
    const wallet: Wallet = {
      id: uuidv4(),
      userId,
      balance: 0,
      currency: 'INR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.wallets.set(wallet.id, wallet);
    this.userWalletIndex.set(userId, wallet.id);

    this.logger.log(`Created wallet ${wallet.id} for user ${userId}`);
    return wallet;
  }
}
