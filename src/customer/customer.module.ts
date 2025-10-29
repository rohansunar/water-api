import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';
import { Customer, CustomerSchema } from '../common/schemas/customer.schema';
import { Address, AddressSchema } from '../common/schemas/address.schema';
import { CustomLoggerService } from '../common/logger/logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomLoggerService],
  exports: [CustomerService],
})
export class CustomerModule {}
