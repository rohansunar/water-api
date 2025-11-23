import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminAuthModule } from './admin-auth.module';
import { VendorModule } from '../vendor/vendor.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LoggerModule } from '../common/logger/logger.module';
import { ProductModule } from '../product/product.module';
import { RefundModule } from '../refund/refund.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    AdminAuthModule,
    VendorModule,
    LedgerModule,
    LoggerModule,
    ProductModule,
    RefundModule,
    OrderModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
