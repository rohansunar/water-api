import { Module } from '@nestjs/common';
import { ComplaintController } from './controllers/complaint.controller';
import { ComplaintService } from './services/complaint.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
