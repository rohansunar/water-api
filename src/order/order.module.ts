import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from '../common/schemas/order.schema';
import {
  OrderItem,
  OrderItemSchema,
} from '../common/schemas/order-item.schema';
import {
  DeliveryTask,
  DeliveryTaskSchema,
} from '../common/schemas/delivery-task.schema';
import { Payment, PaymentSchema } from '../common/schemas/payment.schema';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../modules/user/user.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: DeliveryTask.name, schema: DeliveryTaskSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    ProductModule,
    UserModule,
    LedgerModule,
    CommissionModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
