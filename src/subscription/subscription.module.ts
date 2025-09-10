import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [ProductModule, UserModule, OrderModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
