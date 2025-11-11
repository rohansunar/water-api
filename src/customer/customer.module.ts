import { Module } from '@nestjs/common';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';
import { CustomLoggerService } from '../common/logger/logger.service';

@Module({
  imports: [],
  controllers: [CustomerController],
  providers: [CustomerService, CustomLoggerService],
  exports: [CustomerService],
})
export class CustomerModule {}
