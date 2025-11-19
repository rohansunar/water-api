import { Module } from '@nestjs/common';
import {
  LedgerController,
  AdminLedgerController,
} from './controllers/ledger.controller';
import { LedgerService } from './services/ledger.service';
import { LoggerModule } from '../common/logger/logger.module';

/**
 * Ledger Module
 * Manages vendor financial transactions, analytics, and payouts
 * Replaces the old MonthlyLedgerModule with comprehensive ledger functionality
 */
@Module({
  imports: [LoggerModule],
  controllers: [LedgerController, AdminLedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
