import { Module } from '@nestjs/common';
import { VendorPaymentController } from './controllers/vendor-payment.controller';
import { VendorPaymentService } from './services/vendor-payment.service';
import { VendorAuthModule } from './vendor-auth.module';

@Module({
  imports: [VendorAuthModule],
  controllers: [VendorPaymentController],
  providers: [VendorPaymentService],
  exports: [VendorPaymentService],
})
export class VendorPaymentModule {}
