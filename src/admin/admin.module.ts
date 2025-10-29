import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminAuthModule } from './admin-auth.module';
import { UserModule } from '../modules/user/user.module';
import { VendorModule } from '../vendor/vendor.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LoggerModule } from '../common/logger/logger.module';
import { ProductModerationModule } from '../product/product-moderation.module';
import { RefundModule } from '../refund/refund.module';
import { DisputeModule } from '../dispute/dispute.module';
import { EscalationModule } from '../escalation/escalation.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    AdminAuthModule,
    UserModule,
    VendorModule,
    LedgerModule,
    LoggerModule,
    ProductModerationModule,
    RefundModule,
    DisputeModule,
    EscalationModule,
    OrderModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
