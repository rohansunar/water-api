import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';
import { MonthlyLedgerModule } from '../monthly-ledger/monthly-ledger.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [UserModule, VendorModule, MonthlyLedgerModule, LoggerModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
