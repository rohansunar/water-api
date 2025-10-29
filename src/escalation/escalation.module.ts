import { Module } from '@nestjs/common';
import { EscalationService } from './services/escalation.service';

@Module({
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
