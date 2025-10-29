import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import {
  Wallet,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '../common/schemas/wallet.schema';
import { UserModule } from '../modules/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    UserModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
