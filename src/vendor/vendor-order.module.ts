import { Module } from '@nestjs/common';
import { VendorOrderController } from './controllers/vendor-order.controller';
import { VendorOrderService } from './services/vendor-order.service';
import { VendorService } from './services/vendor.service';
import { VendorAuthModule } from './vendor-auth.module';

@Module({
  imports: [VendorAuthModule],
  controllers: [VendorOrderController],
  providers: [VendorOrderService, VendorService],
  exports: [VendorOrderService],
})
export class VendorOrderModule {}
