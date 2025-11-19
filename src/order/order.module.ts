import { Module } from '@nestjs/common';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { ProductModule } from '../product/product.module';
import { LedgerModule } from '../ledger/ledger.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [ProductModule, LedgerModule, CommissionModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
