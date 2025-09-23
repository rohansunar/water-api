import { Module } from '@nestjs/common';
import { RiderController } from './rider.controller';
import { RiderService } from './rider.service';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../modules/user/user.module';

@Module({
  imports: [OrderModule, UserModule],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [RiderService],
})
export class RiderModule {}
