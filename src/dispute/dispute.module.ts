import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { RefundModule } from '../refund/refund.module';

@Module({
  imports: [RefundModule],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}