import { Module } from '@nestjs/common';
import { RefundService } from './services/refund.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
