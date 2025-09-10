import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { MonthlyLedgerModule } from '../monthly-ledger/monthly-ledger.module';

@Module({
  imports: [ProductModule, UserModule, MonthlyLedgerModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
