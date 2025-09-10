import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [UserModule, OrderModule],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
