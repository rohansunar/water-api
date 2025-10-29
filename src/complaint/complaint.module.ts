import { Module } from '@nestjs/common';
import { ComplaintController } from './controllers/complaint.controller';
import { ComplaintService } from './services/complaint.service';
import { UserModule } from '../modules/user/user.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [UserModule, OrderModule],
  controllers: [ComplaintController],
  providers: [ComplaintService],
  exports: [ComplaintService],
})
export class ComplaintModule {}
