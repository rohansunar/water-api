import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonthlyLedgerController } from './monthly-ledger.controller';
import { MonthlyLedgerService } from './monthly-ledger.service';
import { MonthlyLedger, MonthlyLedgerSchema } from '../common/schemas/monthly-ledger.schema';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonthlyLedger.name, schema: MonthlyLedgerSchema }
    ]),
    LoggerModule,
  ],
  controllers: [MonthlyLedgerController],
  providers: [MonthlyLedgerService],
  exports: [MonthlyLedgerService],
})
export class MonthlyLedgerModule {}
