import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { LedgerModule } from '../ledger/ledger.module';
import { UserModule } from '../modules/user/user.module';

@Module({
  imports: [LedgerModule, UserModule],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}