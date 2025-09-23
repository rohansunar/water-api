import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LedgerController, AdminLedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import {
  LedgerEntry,
  LedgerEntrySchema,
} from '../common/schemas/ledger-entry.schema';
import {
  Payout,
  PayoutSchema,
} from '../common/schemas/payout.schema';
import { LoggerModule } from '../common/logger/logger.module';

/**
 * Ledger Module
 * Manages vendor financial transactions, analytics, and payouts
 * Replaces the old MonthlyLedgerModule with comprehensive ledger functionality
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: Payout.name, schema: PayoutSchema },
    ]),
    LoggerModule,
  ],
  controllers: [LedgerController, AdminLedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
