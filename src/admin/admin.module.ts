import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../modules/user/user.module';
import { VendorModule } from '../vendor/vendor.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [UserModule, VendorModule, LedgerModule, LoggerModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
