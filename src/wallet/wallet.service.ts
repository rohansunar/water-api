import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, WalletTransaction, TransactionType, TransactionStatus, ReferenceType } from '../common/interfaces/wallet.interface';
import { TopupWalletDto, WalletResponseDto, WalletTransactionDto } from '../common/dto/wallet.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class WalletService implements OnModuleDestroy {
  private readonly logger = new Logger(WalletService.name);
  private readonly wallets = new Map<string, Wallet>();
  private readonly transactions = new Map<string, WalletTransaction>();
  private readonly userWalletIndex = new Map<string, string>(); // userId -> walletId
  private readonly walletTransactionIndex = new Map<string, string[]>(); // walletId -> transactionIds
  private readonly pendingTimeouts = new Set<NodeJS.Timeout>();

  constructor(private readonly userService: UserService) {}

  onModuleDestroy() {
    // Clean up all pending timeouts to prevent memory leaks
    this.pendingTimeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    this.pendingTimeouts.clear();
    this.logger.log('Cleaned up all pending timeouts');
  }

  async getWallet(userId: string): Promise<WalletResponseDto> {
    let wallet = await this.findByUserId(userId);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.createWallet(userId);
    }

    const transactionIds = this.walletTransactionIndex.get(wallet.id) || [];
    const transactions = transactionIds
      .map(id => this.transactions.get(id))
      .filter(Boolean) as WalletTransaction[];

    // Sort transactions by creation date (newest first)
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
      transactions: transactions.slice(0, 20).map(transaction => ({
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

  async topupWallet(userId: string, topupDto: TopupWalletDto): Promise<{ message: string; transactionId: string; paymentUrl?: string }> {
    try {
      let wallet = await this.findByUserId(userId);
      
      if (!wallet) {
        wallet = await this.createWallet(userId);
      }

      if (!wallet.isActive) {
        throw new BadRequestException('Your wallet is currently inactive. Please contact support to reactivate your wallet.');
      }

      // Validate topup amount
      if (topupDto.amount < 1 || topupDto.amount > 10000) {
        throw new BadRequestException('Topup amount must be between ₹1 and ₹10,000. Please enter a valid amount within this range.');
      }

      // Create completed transaction (simplified without payment gateway simulation)
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

      // Update wallet balance immediately
      wallet.balance += topupDto.amount;
      wallet.updatedAt = new Date();
      this.wallets.set(wallet.id, wallet);

      // Update user wallet balance
      await this.userService.updateWalletBalance(userId, topupDto.amount);

      // Store transaction
      this.transactions.set(transaction.id, transaction);

      // Update wallet transaction index
      const walletTransactions = this.walletTransactionIndex.get(wallet.id) || [];
      walletTransactions.push(transaction.id);
      this.walletTransactionIndex.set(wallet.id, walletTransactions);

      this.logger.log(`Completed topup transaction ${transaction.id} for user ${userId}: ₹${topupDto.amount}`);

      return {
        message: 'Topup completed successfully',
        transactionId: transaction.id,
      };
    } catch (error) {
      this.logger.error(`Topup failed for user ${userId}:`, error);
      throw error;
    }
  }

  async addMoney(userId: string, amount: number, description: string, referenceId?: string, referenceType?: ReferenceType): Promise<WalletTransaction> {
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

    this.logger.log(`Added ₹${amount} to wallet for user ${userId}. New balance: ₹${wallet.balance}`);
    return transaction;
  }

  async deductMoney(userId: string, amount: number, description: string, referenceId?: string, referenceType?: ReferenceType): Promise<WalletTransaction> {
    let wallet = await this.findByUserId(userId);
    
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(`Insufficient wallet balance. Your current balance is ₹${wallet.balance}, but ₹${amount} is required. Please add money to your wallet.`);
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

    this.logger.log(`Deducted ₹${amount} from wallet for user ${userId}. New balance: ₹${wallet.balance}`);
    return transaction;
  }

  private async findByUserId(userId: string): Promise<Wallet | null> {
    const walletId = this.userWalletIndex.get(userId);
    if (!walletId) return null;
    return this.wallets.get(walletId) || null;
  }

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
